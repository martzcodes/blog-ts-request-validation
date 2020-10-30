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

    const modelSchemas: { [key: string]: ModelOptions } = getSchemas(
      `${__dirname}/interfaces`,
      restApi.restApiId,
    );
    console.log(JSON.stringify(modelSchemas));
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
        requestModels: {
          'application/json': models.Basic,
        },
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

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'blog-validation-stack', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();
