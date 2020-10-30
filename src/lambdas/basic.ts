// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Basic } from '../interfaces/basic';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {

  const body = JSON.parse(event.body || '') as Basic;

  return {
    statusCode: 200,
    body: `Hello ${event.pathParameters?.hello || 'no one'}.  How many times have you ${body.someString || 'worked'}?  ${body.someNumber || 0} times.`,
  };
};
