variable "source_bucket" {
    default = "video-source-bucket"
}

variable "destination_bucket" {
    default = "video-source-destination-bucket"
}

resource "aws_iam_role_policy" "store_transactions_put" {
  name = "VideoResizerExecutionPolicy"
  role = "${aws_iam_role.iam_for_lambda.id}"
  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:*"
            ],
            "Resource": [
                "arn:aws:logs:*:*:*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:*"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:GetObject",
            "Resource": {
                "Fn::Join": [
                    "",
                    [
                        "arn:aws:s3:::",
                        "${var.source_bucket},
                        "/*"
                    ]
                ]
            }
        },
        {
            "Effect": "Allow",
            "Action": "s3:PutObject",
            "Resource": {
                "Fn::Join": [
                    "",
                    [
                        "arn:aws:s3:::",
                        "${var.destination_bucket},
                        "/*"
                    ]
                ]
            }
        }
    ]
}
EOF
}

resource "aws_iam_role" "iam_for_lambda" {
    name = "iam_for_lambda"
    assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_lambda_function" "opszero_lambda" {
  filename = "output.zip"
  function_name = "opszero_buy_button"
  role = "${aws_iam_role.iam_for_lambda.arn}"
  handler = "index.handler"
  source_code_hash = "${base64sha256(file("output.zip"))}"
}
