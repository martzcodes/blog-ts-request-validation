import {
  LambdaIntegration,
  Model,
  ModelOptions,
  PassthroughBehavior,
  RestApi,
} from '@aws-cdk/aws-apigateway';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { getSchemas } from './util/ast';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define the lambda functions
    const basicLambda = new NodejsFunction(this, 'basicLambdaFunction', {
      entry: `${__dirname}/lambdas/basic.ts`,
      handler: 'handler',
      runtime: Runtime.NODEJS_12_X,
    });

    const advancedLambda = new NodejsFunction(this, 'advancedLambdaFunction', {
      entry: `${__dirname}/lambdas/advanced.ts`,
      handler: 'handler',
      runtime: Runtime.NODEJS_12_X,
    });

    // create the api and the unvalidated api (for ease of comparison)
    const restApi = new RestApi(this, 'BlogValidationApi');

    const unvalidatedResource = restApi.root.addResource('unvalidated');
    const unvalidatedHelloResource = unvalidatedResource.addResource('{hello}');
    const unvalidatedHelloBasicResource = unvalidatedHelloResource.addResource(
      'basic',
    );

    unvalidatedHelloBasicResource.addMethod(
      'POST',
      new LambdaIntegration(basicLambda),
      {},
    );
    const unvalidatedHelloAdvancedResource = unvalidatedHelloResource.addResource(
      'advanced',
    );
    unvalidatedHelloAdvancedResource.addMethod(
      'POST',
      new LambdaIntegration(advancedLambda),
      {},
    );

    // get the schemas and create the Models for the api
    const modelSchemas: { [key: string]: ModelOptions } = getSchemas(
      `${__dirname}/interfaces`,
      restApi.restApiId,
    );
    // put them in the models object with the key naming being the same as the interface
    const models: { [key: string]: Model } = {};
    Object.keys(modelSchemas).forEach((modelSchema) => {
      if (modelSchemas[modelSchema].modelName) {
        models[modelSchema] = restApi.addModel(
          modelSchemas[modelSchema].modelName || '',
          modelSchemas[modelSchema],
        );
      }
    });

    const validatedResource = restApi.root.addResource('validated');
    const validatedHelloResource = validatedResource.addResource('{hello}');
    const validatedHelloBasicResource = validatedHelloResource.addResource(
      'basic',
    );
    // create the first, basic, validator
    const basicValidator = restApi.addRequestValidator('BasicValidator', {
      validateRequestParameters: true,
      validateRequestBody: true,
    });
    validatedHelloBasicResource.addMethod(
      'POST',
      new LambdaIntegration(basicLambda, {
        passthroughBehavior: PassthroughBehavior.NEVER,
      }),
      {
        // Basic is the interface in this case
        requestModels: {
          'application/json': models.Basic,
        },
        // requestParameters defines which parameters to actually require
        // hello matches what we have above in the resource ({hello})
        requestParameters: {
          'method.request.path.hello': true,
        },
        requestValidator: basicValidator,
      },
    );
    const validatedHellowAdvancedResource = validatedHelloResource.addResource(
      'advanced',
    );
    const advancedValidator = restApi.addRequestValidator('AdvancedValidator', {
      validateRequestParameters: true,
      validateRequestBody: true,
    });
    validatedHellowAdvancedResource.addMethod(
      'POST',
      new LambdaIntegration(advancedLambda, {
        passthroughBehavior: PassthroughBehavior.NEVER,
      }),
      {
        requestParameters: {
          'method.request.path.hello': true,
        },
        requestValidator: advancedValidator,
        requestModels: {
          'application/json': models.Advanced,
        },
      },
    );
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'blog-validation-stack', { env: devEnv });

app.synth();
