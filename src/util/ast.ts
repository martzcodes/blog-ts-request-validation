import { readdirSync } from 'fs';
import { join as pathJoin } from 'path';
import {
  JsonSchema,
  JsonSchemaType,
  JsonSchemaVersion,
  ModelOptions,
} from '@aws-cdk/aws-apigateway';
import {
  createProgram,
  Node,
  Symbol,
  forEachChild,
  isInterfaceDeclaration,
  // eslint-disable-next-line import/no-extraneous-dependencies
} from 'typescript';
// typescript isn't actually compiled into anything, this is used when cdk creates the stack
// so i'd still consider this a "devDependency"

// this is the basic ModelOptions template that will be used in CDK to generate the rest api models
const interfaceTemplate = (
  interfaceName: string,
  schemaProps: { properties: JsonSchema['properties']; required: string[] },
): ModelOptions => ({
  contentType: 'application/json',
  modelName: `${interfaceName}Model`,
  schema: {
    schema: JsonSchemaVersion.DRAFT4,
    title: `${interfaceName}Model`,
    type: JsonSchemaType.OBJECT,
    properties: schemaProps.properties,
    required: schemaProps.required,
  },
});

export const getSchemas = (directoryPath: string, restApi: string) => {
  const interfaces: { [key: string]: ModelOptions } = {};

  // get all the interface file paths
  const filePaths: string[] = readdirSync(directoryPath).map((file) =>
    pathJoin(directoryPath, file),
  );
  const program = createProgram(filePaths, {});
  const checker = program.getTypeChecker();

  // this method will build the actual schemas
  const getSchemaProperties = (
    node: Node,
    symbol: Symbol,
  ): { properties: JsonSchema['properties']; required: string[] } => {
    const schemaProperties: {
      properties: JsonSchema['properties'];
      required: string[];
    } = {
      properties: {},
      required: [],
    };
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const properties = checker.getPropertiesOfType(type);

    properties.forEach((property) => {
      const propertyType = checker.getTypeOfSymbolAtLocation(property, node);
      const propertyTypeName = (propertyType as any).intrinsicName;
      if (schemaProperties.properties) {
        switch (propertyTypeName) {
          case undefined:
            // the undefined case is where the type ends up being another interface
            if (propertyType.symbol.name in interfaces) {
              // in this case we've already built the schema... so use the reference to it...
              schemaProperties.properties[property.name] = {
                ref: `https://apigateway.amazonaws.com/restapis/${restApi}/models/${propertyType.symbol.name}Model`,
              };
            } else {
              // in this case the schema isn't defined... so embedded it within this schema
              propertyType.symbol;
              schemaProperties.properties[property.name] = getSchemaProperties(
                node,
                propertyType.symbol,
              );
            }
            break;
          case 'number':
            schemaProperties.properties[property.name] = {
              type: JsonSchemaType.NUMBER,
              // The RestAPI validator doesnt actually check if a number is a number... the pattern can handle that though:
              pattern: '[0-9]+',
            };
            break;
          case 'string':
            schemaProperties.properties[property.name] = {
              type: JsonSchemaType.STRING,
            };
            break;
          default:
            break;
        }
      }

      const optional = !!(property.valueDeclaration as any).questionToken;
      if (!optional) {
        schemaProperties.required.push(property.name);
      }
    });
    return schemaProperties;
  };

  // to make this a _little_ more efficient, we're going to first get all the internal interfaces (non-3rd-party)
  // and make sure we define the models in order to maximize model inheritance
  const imports: {
    [key: string]: {
      filePath: string;
      interfaces: Set<string>;
      internal: number;
    };
  } = {};

  filePaths.forEach((filePath) => {
    const source = program.getSourceFile(filePath);

    if (source) {
      forEachChild(source, (node) => {
        if (isInterfaceDeclaration(node)) {
          const symbol = checker.getSymbolAtLocation(node.name);
          if (symbol) {
            const name = symbol.name;
            imports[name] = { filePath, interfaces: new Set([]), internal: 0 };
            const type = checker.getDeclaredTypeOfSymbol(symbol);
            const properties = checker.getPropertiesOfType(type);

            properties.forEach((property) => {
              const propertyType = checker.getTypeOfSymbolAtLocation(
                property,
                node,
              );
              const propertyTypeName = (propertyType as any).intrinsicName;
              if (!propertyTypeName) {
                imports[name].interfaces.add(propertyType.symbol.name);
              }
            });
          }
        }
      });
    }
  });

  // now sort the list so that child interfaces are first and parents can inherit from them
  // that sounds backwards... but is how it is
  Object.keys(imports).forEach((imp) => {
    const importedInterfaces = [...imports[imp].interfaces];
    imports[imp].internal = importedInterfaces.filter((importedInterface) => {
      return importedInterface in imports;
    }).length;
    return imp;
  });
  const processPaths = Object.keys(imports)
    .sort((a, b) => {
      return imports[a].interfaces.size - imports[b].interfaces.size;
    })
    .map((toProcess) => imports[toProcess].filePath);

  // finally actually build the schemas
  processPaths.forEach((filePath) => {
    const source = program.getSourceFile(filePath);
    if (source) {
      forEachChild(source, (node) => {
        if (isInterfaceDeclaration(node)) {
          const symbol = checker.getSymbolAtLocation(node.name);
          if (symbol) {
            const name = symbol.name;
            interfaces[name] = interfaceTemplate(
              name,
              getSchemaProperties(node, symbol),
            );
          }
        }
      });
    }
  });
  return interfaces;
};
