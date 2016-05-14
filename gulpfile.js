var http = require('http');
var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var shell = require('gulp-shell');
var flatten = require('gulp-flatten');
var rename = require('gulp-rename');
var del = require('del');
var install = require('gulp-install');
var zip = require('gulp-zip');
var AWS = require('aws-sdk');
var runSequence = require('run-sequence');
var async = require('async');
var s3 = new AWS.S3();
var lambda = new AWS.Lambda();

var config;
try {
        config = require('./config.json');
} catch (ex) {
        config = {};
}

var filename = './build/ffmpeg-git-64bit-static.tar.xz';
var fileURL = 'http://johnvansickle.com/ffmpeg/builds/ffmpeg-git-64bit-static.tar.xz';

gulp.task('postinstall', function(cb) {
        async.reject(
                ['config.json', 'test_event.json'],
                fs.exists,
                function(files) {
                        async.map(files, function(file, cb) {
                                return cb(null, gulp.src(file.replace(/\.json/, '_sample.json'))
                                                .pipe(rename(file))
                                                .pipe(gulp.dest('.'))
                                );
                        }, cb);
                }
        );
});

gulp.task('download-ffmpeg', function(cb) {
        if(!fs.existsSync('./build')) {
                fs.mkdirSync('./build');
        }

        var file = fs.createWriteStream(filename);
        http.get(fileURL, function(response) {
                response.pipe(file);

                file.on('finish', function() {
                        file.close();
                        cb();
                })
        });
});

// Resorting to using a shell task. Tried a number of other things including
// LZMA-native, node-xz, decompress-tarxz. None of them work very well with this.
// This will probably work well for OS X and Linux, but maybe not Windows without Cygwin.
gulp.task('untar-ffmpeg', shell.task([
        'tar -xvf ' + filename + ' -C ./build'
]));

gulp.task('copy-ffmpeg', function() {
        return gulp.src(['build/ffmpeg-*/ffmpeg', 'build/ffmpeg-*/ffprobe'])
                .pipe(flatten())
                .pipe(gulp.dest('./dist'));
});

/*
 From: https://medium.com/@AdamRNeary/a-gulp-workflow-for-amazon-lambda-61c2afd723b6
 */

// First we need to clean out the dist folder and remove the compiled zip file.
gulp.task('clean', function() {
        return del([
                './build/*',
                './dist/*',
                './dist.zip'
        ]);
});

// The js task could be replaced with gulp-coffee as desired.
gulp.task('js', function() {
        return gulp.src(['index.js', 'config.json'])
                .pipe(gulp.dest('./dist'))
});

// Here we want to install npm packages to dist, ignoring devDependencies.
gulp.task('npm', function() {
        return gulp.src('./package.json')
                .pipe(gulp.dest('./dist'))
                .pipe(install({production: true}));
});

// Now the dist directory is ready to go. Zip it.
gulp.task('zip', function() {
        return gulp.src(['dist/**/*', '!dist/package.json', 'dist/.*'])
                .pipe(zip('output.zip'))
                .pipe(gulp.dest('./'));
});

var packageInfo = require('./package.json');
var bucket = config.functionBucket;
var functionName = packageInfo.name;
var key = functionName + '.zip';

var stackName = packageInfo.name;

// Builds the function and uploads
gulp.task('build-upload', function(cb) {
        return runSequence(
                'clean',
                'download-ffmpeg',
                'untar-ffmpeg',
                ['copy-ffmpeg', 'js', 'npm'],
                'zip',
                cb
        );
});

// For a new stack (or you change cloudformation.json)
gulp.task('default', function(cb) {
        return runSequence(
                'build-upload',
                cb
        );
});
