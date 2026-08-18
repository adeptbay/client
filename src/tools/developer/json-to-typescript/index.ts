import { defineTool, ToolError } from '@core/tool';
import { describeJsonError, parseJson } from '@engines/format';
import { jsonToTypeScript } from '@engines/typegen';

interface Options {
  rootName: string;
  style: 'interface' | 'type';
  nested: 'named' | 'inline';
  optionalMissing: boolean;
  preferUnknown: boolean;
  readonlyProps: boolean;
}

export default defineTool<string, Options>({
  slug: 'json-to-typescript',
  category: 'developer',
  cluster: 'json',

  name: 'JSON to TypeScript',
  tagline: 'Generate interfaces from a JSON sample, merging every array element instead of just the first.',
  titleBenefit: 'Every Element Merged',
  description:
    'Turn a JSON sample into TypeScript interfaces. Every array element is merged, so a key that is missing from some records becomes optional instead of being promised.',
  keywords: [
    'json to typescript',
    'json to interface',
    'generate typescript types from json',
    'json to type',
    'typescript interface generator',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 8, serp: 7, money: 4, ease: 7 },

  input: {
    type: 'text',
    label: 'JSON sample',
    placeholder: '{"id":1,"name":"…"}',
    rows: 12,
    sample:
      '{\n' +
      '  "page": 1,\n' +
      '  "results": [\n' +
      '    { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com", "manager": null, "roles": ["admin"] },\n' +
      '    { "id": 2, "name": "Grace Hopper", "manager": { "id": 1, "name": "Ada Lovelace" }, "roles": [], "lastSeen": "2026-08-14T09:20:00Z" }\n' +
      '  ]\n' +
      '}',
  },

  options: [
    {
      key: 'rootName',
      type: 'text',
      label: 'Root type name',
      default: 'Root',
      maxLength: 40,
      help: 'Nested types are named after the key they came from, and an array element after the singular of its key.',
    },
    {
      key: 'style',
      type: 'enum',
      label: 'Declare as',
      default: 'interface',
      values: [
        { value: 'interface', label: 'interface' },
        { value: 'type', label: 'type alias' },
      ],
    },
    {
      key: 'nested',
      type: 'enum',
      label: 'Nested objects',
      default: 'named',
      values: [
        { value: 'named', label: 'Extracted into named types' },
        { value: 'inline', label: 'Nested inline, one declaration' },
      ],
    },
    {
      key: 'optionalMissing',
      type: 'bool',
      label: 'Mark keys missing from some elements as optional',
      default: true,
      help: 'This is the whole point of merging every element. Turning it off asserts that the first record is representative.',
    },
    {
      key: 'preferUnknown',
      type: 'bool',
      label: 'Use unknown instead of any',
      default: true,
      help: 'For empty arrays, where nothing can be inferred. `unknown` forces a check at the point of use; `any` disables it.',
    },
    { key: 'readonlyProps', type: 'bool', label: 'Mark every property readonly', default: false },
  ],

  output: { type: 'text', mono: true, language: 'typescript', label: 'TypeScript' },

  howTo: [
    {
      title: 'Paste a real response, not a hand-written example',
      detail: 'The more records the sample holds, the more accurate the result — optional keys can only be found by seeing a record without them.',
    },
    {
      title: 'Name the root type',
      detail: 'Nested types take their names from their keys, and an array element from the singular of its key, so `results` produces `Result`.',
    },
    {
      title: 'Read the optional markers',
      detail: 'Every `?` is a key that some element in your sample did not have. Those are listed below the result so you can confirm each one.',
    },
    {
      title: 'Paste it in and narrow by hand',
      detail: 'A generated type describes the sample. Literal unions, branded ids and date types are decisions only you can make.',
    },
  ],

  faq: [
    {
      q: 'Why does my type have optional properties the API documentation does not mention?',
      a: 'Because a record in your sample lacked that key. Every element of every array is merged here rather than the first one being taken as representative, so a field that only some records carry is marked optional. If the documentation disagrees, one of the two is wrong and it is worth knowing which.',
    },
    {
      q: 'How does it handle null?',
      a: 'As a widening, not a replacement. If a key is null in one element and a string in another, the type is `string | null` rather than whichever came first. A key that is null in every element can only be typed `null`, which is a signal that the sample is too small.',
    },
    {
      q: 'What happens to an empty array?',
      a: 'It becomes `unknown[]`, because nothing about the element type can be inferred from zero elements. `unknown` rather than `any` by default, so the compiler makes you narrow it at the point of use instead of silently allowing anything.',
    },
    {
      q: 'Why do two different keys share one interface?',
      a: 'Because their shapes are identical. An object with the same keys and the same value types is the same type, so it is emitted once and referenced twice rather than duplicated. If they should be distinct types in your code, rename one after pasting.',
    },
    {
      q: 'Are dates detected?',
      a: 'No. An ISO 8601 timestamp is a string in JSON and is typed `string`, deliberately. Typing it `Date` would be a lie: `JSON.parse` returns a string, and code that trusted the type would call `.getTime()` on a string at runtime.',
    },
    {
      q: 'Is this a substitute for a schema?',
      a: 'No, and that is the honest limit. A generated type describes the sample you pasted, not the API contract. It is a fast, accurate starting point; an OpenAPI document or a runtime validator such as Zod is what tells you when the server changes.',
    },
  ],

  infoGain: {
    summary:
      'Almost every JSON-to-TypeScript converter types an array from its first element. That fails on real API responses in a specific way: the second page holds the record where a key is absent, and the generated type promises it is always there. Every element is merged here, so missing keys become optional and mixed types become unions.',
    table: {
      caption: 'What merging every element changes',
      head: ['Sample', 'First-element inference', 'Here'],
      rows: [
        ['[{a:1,b:2},{a:3}]', 'b: number', 'b?: number'],
        ['[{v:null},{v:"x"}]', 'v: null', 'v: string | null'],
        ['[{v:1},{v:"1"}]', 'v: number', 'v: number | string'],
        ['{tags: []}', 'tags: any[]', 'tags: unknown[]'],
        ['{from:{x:1},to:{x:2}}', 'Two identical interfaces', 'One interface, referenced twice'],
      ],
    },
    supports: [
      'Every element of every array merged, at any nesting depth',
      'Optional properties derived from records that lack the key',
      'Unions for mixed types, with null ordered last',
      'Structurally identical objects deduplicated to one named type',
      'Keys that are not valid identifiers quoted correctly',
      'interface or type alias, named or inline nesting, optional readonly',
    ],
    limits: [
      'The output describes your sample, not the API. A field absent from every record in the sample cannot appear in the type.',
      'Dates stay `string`, and integers and floats are both `number` — JSON does not distinguish them and neither does TypeScript.',
      'No literal unions. A status field that is always "active" in the sample is typed `string`, because inferring an enum from one sample is usually wrong.',
      'Type names come from keys, so two unrelated shapes under the same key name will collide and be numbered.',
    ],
    verified: '2026-08',
  },

  related: [
    'json-formatter',
    'json-to-yaml',
    'json-diff',
    'json-to-csv',
    'regex-tester',
    'jwt-decoder',
    'slug-generator',
    'uuid-generator',
  ],
  nextSteps: ['json-formatter', 'json-diff', 'json-to-yaml'],

  added: '2026-08-17',
  updated: '2026-08-17',

  run: (input, options) => {
    if (input.trim() === '') return { output: '' };

    let parsed: unknown;
    try {
      parsed = parseJson(input);
    } catch (err) {
      const { message, hint } = describeJsonError(err);
      throw new ToolError(message, hint);
    }

    const result = jsonToTypeScript(parsed, options);

    const notes: string[] = [];
    if (result.optionalKeys.length > 0) {
      notes.push(
        `Optional because some records lacked them: ${result.optionalKeys.join(', ')}. Each one is a key present in part of your sample only.`,
      );
    }
    if (result.code.includes('unknown[]') || result.code.includes('any[]')) {
      notes.push(
        'An empty array cannot be typed from its contents. Paste a sample that has at least one element in it, or narrow that property by hand.',
      );
    }
    if (result.unionCount > 0) {
      notes.push(
        `${result.unionCount} propert${result.unionCount === 1 ? 'y holds' : 'ies hold'} more than one type across your sample. Where that is the API being inconsistent rather than genuinely polymorphic, it is worth reporting upstream.`,
      );
    }
    notes.push(
      'This describes the sample you pasted. It is a starting point, not a contract — an OpenAPI document or a runtime validator is what tells you when the server changes.',
    );

    return {
      output: result.code,
      filename: 'types.ts',
      stats: [
        { label: 'Types', value: result.typeCount, primary: true },
        { label: 'Properties', value: result.propertyCount, primary: true },
        { label: 'Optional', value: result.optionalCount, primary: true },
        { label: 'Nesting depth', value: result.depth, primary: true },

        { label: 'Union types', value: result.unionCount },
        { label: 'Declared as', value: options.style === 'interface' ? 'interface' : 'type alias' },
        { label: 'Lines generated', value: result.code.trimEnd().split('\n').length },
      ],
      notes,
    };
  },
});
