import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';

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
    const unvalidatedHelloResource = unvalidatedResource.addResource(
      '{hello}',
    );
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

    const validatedResource = restApi.root.addResource('validated');
    const validatedHelloResource = validatedResource.addResource('{hello}');
    const validatedHelloBasicResource = validatedHelloResource.addResource(
      'basic',
    );
    validatedHelloBasicResource.addMethod(
      'POST',
      new LambdaIntegration(basicLambda),
      {
        requestParameters: {
          'method.request.path.hello': true,
        },
        requestValidatorOptions: {
          validateRequestParameters: true,
          requestValidatorName: 'basicValidator',
        },
      },
    );
    const validatedHellowAdvancedResource = validatedHelloResource.addResource(
      'advanced',
    );
    validatedHellowAdvancedResource.addMethod(
      'POST',
      new LambdaIntegration(advancedLambda),
      {},
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
