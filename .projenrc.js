const { AwsCdkTypeScriptApp } = require("projen");

const project = new AwsCdkTypeScriptApp({
  cdkVersion: "1.71.0",
  name: "blog-ts-request-validation",
  authorName: "Matt Martz",
  authorUrl: "https://matt.martz.codes",
  cdkDependencies: [
    "@aws-cdk/core",
    "@aws-cdk/aws-apigateway",
    "@aws-cdk/aws-lambda",
    "@aws-cdk/aws-lambda-nodejs",
  ],
  devDependencies: {
    "@types/aws-lambda": "8.10.63",
  },
});

project.synth();
