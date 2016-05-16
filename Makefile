VERSION := $(shell cat package.json | jq -r '.version')

deps:
	npm install

install:
	terraform plan
	terraform apply

release:
	gulp
	zip -r opszero-video-resizer-$(VERSION).zip Makefile config.json.example dist README.md
	cp opszero-video-resizer-$(VERSION).zip output.zip
	curl -T opszero-buy-button-with-stripe-$(VERSION).zip ftp://ftp.sendowl.com --user $(SENDOWL_FTP_USER):$(SENDOWL_FTP_PASSWORD)


clean:
	gulp clean
