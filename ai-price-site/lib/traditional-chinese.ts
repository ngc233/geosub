import OpenCC from "opencc-js";

const convertToTaiwanTraditional = OpenCC.Converter({
  from: "cn",
  to: "twp",
});

const stringCache = new Map<string, string>();
const valueCache = new WeakMap<object, unknown>();
const taiwanTerminology = [
  ["賬號", "帳號"],
  ["賬單", "帳單"],
  ["平臺", "平台"],
] as const;

export function toTraditionalChineseText(value: string) {
  const cached = stringCache.get(value);

  if (cached !== undefined) {
    return cached;
  }

  const localizedValue = value.replace(/^\/zh(?=\/|$)/, "/zh-tw");
  const converted = taiwanTerminology.reduce(
    (text, [source, target]) => text.replaceAll(source, target),
    convertToTaiwanTraditional(localizedValue),
  );
  stringCache.set(value, converted);
  return converted;
}

export function toTraditionalChinese<T>(value: T): T {
  if (typeof value === "string") {
    return toTraditionalChineseText(value) as T;
  }

  if (typeof value === "function") {
    const cached = valueCache.get(value);

    if (cached) {
      return cached as T;
    }

    const convertedFunction = (...args: unknown[]) =>
      toTraditionalChinese(
        (value as (...functionArgs: unknown[]) => unknown)(...args),
      );

    valueCache.set(value, convertedFunction);
    return convertedFunction as T;
  }

  if (Array.isArray(value)) {
    const cached = valueCache.get(value);

    if (cached) {
      return cached as T;
    }

    const convertedArray = value.map((item) => toTraditionalChinese(item));
    valueCache.set(value, convertedArray);
    return convertedArray as T;
  }

  if (value && typeof value === "object") {
    const cached = valueCache.get(value);

    if (cached) {
      return cached as T;
    }

    const convertedObject = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        toTraditionalChinese(item),
      ]),
    );

    valueCache.set(value, convertedObject);
    return convertedObject as T;
  }

  return value;
}

export function withTraditionalChinese<TRecord extends { zh: unknown }>(
  record: TRecord,
): TRecord & { "zh-tw": TRecord["zh"] } {
  return {
    ...record,
    "zh-tw": toTraditionalChinese(record.zh),
  };
}
