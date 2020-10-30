// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Advanced } from '../interfaces/advanced';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || '') as Advanced;

  return {
    statusCode: 200,
    body: `${body.greeting} ${
      event.pathParameters?.hello || 'no one'
    }.  How many times have you ${body.basic.someString || 'worked'}?  ${
      body.basic.someNumber || 0
    } times. ${body.postfix}`,
  };
};
