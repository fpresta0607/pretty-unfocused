import { XMLParser } from 'fast-xml-parser';

export type XmlNode = Record<string, unknown>;

export function isXmlNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseXml(xml: string, arrayTagNames: readonly string[]): XmlNode {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: false,
    isArray: (tagName) => arrayTagNames.includes(tagName),
  });
  const document: unknown = parser.parse(xml);
  return isXmlNode(document) ? document : {};
}

export function readNode(parent: XmlNode, tagName: string): XmlNode | undefined {
  const child = parent[tagName];
  return isXmlNode(child) ? child : undefined;
}

export function readNodes(parent: XmlNode, tagName: string): XmlNode[] {
  const children = parent[tagName];
  return Array.isArray(children) ? children.filter(isXmlNode) : [];
}

export function readText(parent: XmlNode, tagName: string): string | undefined {
  const child = parent[tagName];
  if (typeof child === 'string') {
    return child;
  }
  if (isXmlNode(child) && typeof child['#text'] === 'string') {
    return child['#text'];
  }
  return undefined;
}

export function readAttribute(node: XmlNode, attributeName: string): string | undefined {
  const value = node[`@_${attributeName}`];
  return typeof value === 'string' ? value : undefined;
}

export function readRequiredText(parent: XmlNode, tagName: string, label: string): string {
  const text = readText(parent, tagName);
  if (text === undefined || text.trim() === '') {
    throw new Error(`${label} is missing <${tagName}>`);
  }
  return text;
}
