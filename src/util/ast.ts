import { readdirSync } from 'fs';
import { join as pathJoin } from 'path';
import { JsonSchemaType, JsonSchemaVersion } from '@aws-cdk/aws-apigateway';
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

const interfaceTemplate = (interfaceName: string) => ({
  contentType: 'application/json',
  modelName: `${interfaceName}Model`,
  schema: {
    schema: JsonSchemaVersion.DRAFT4,
    title: `${interfaceName}Model`,
    type: JsonSchemaType.OBJECT,
    properties: {},
    required: [],
  },
});

export const getSchemas = (directoryPath: string, restApi: string) => {
  const interfaces: { [key: string]: any } = {};

  const filePaths: string[] = readdirSync(directoryPath).map((file) =>
    pathJoin(directoryPath, file),
  );
  const program = createProgram(filePaths, {});
  const checker = program.getTypeChecker();

  const getSchemaProperties = (
    node: Node,
    symbol: Symbol,
  ): { properties: any; required: string[] } => {
    const schemaProperties: { properties: any; required: string[] } = {
      properties: {},
      required: [],
    };
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const properties = checker.getPropertiesOfType(type);

    properties.forEach((property) => {
      const propertyType = checker.getTypeOfSymbolAtLocation(property, node);
      const propertyTypeName = (propertyType as any).intrinsicName;
      switch (propertyTypeName) {
        case undefined:
          if (propertyType.symbol.name in interfaces) {
            schemaProperties.properties[property.name] = {
              ref: `https://apigateway.amazonaws.com/restapis/${restApi}/models/${propertyType.symbol.name}Model`,
            };
          } else {
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

      const optional = !!(property.valueDeclaration as any).questionToken;
      if (!optional) {
        schemaProperties.required.push(property.name);
      }
    });
    return schemaProperties;
  };

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
  console.log(processPaths);

  processPaths.forEach((filePath) => {
    const source = program.getSourceFile(filePath);

    if (source) {
      forEachChild(source, (node) => {
        if (isInterfaceDeclaration(node)) {
          const symbol = checker.getSymbolAtLocation(node.name);
          if (symbol) {
            const name = symbol.name;
            interfaces[name] = interfaceTemplate(name);
            interfaces[name].schema = {
              ...interfaces[name].schema,
              ...getSchemaProperties(node, symbol),
            };
          }
        }
      });
    }
  });
  return interfaces;
};
