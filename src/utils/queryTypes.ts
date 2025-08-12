function isObject(val: string) {
  return val.constructor === Object;
}

function isNumber(val: string) {
  return !isNaN(parseFloat(val)) && isFinite(val);
}

function isBoolean(val: string) {
  return val === "false" || val === "true";
}

function isArray(val: string) {
  return Array.isArray(val);
}

function isDate(val: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(val);
}

function parseDate(val: string) {
  return new Date(val);
}

function parseValue(val: string) {
  if (typeof val == "undefined" || val == "") {
    return null;
  } else if (isDate(val)) {
    return parseDate(val);
  } else if (isBoolean(val)) {
    return parseBoolean(val);
  } else if (isArray(val)) {
    return parseArray(val);
  } else if (isObject(val)) {
    return parseObject(val);
  } else if (isNumber(val)) {
    return parseNumber(val);
  } else {
    return val;
  }
}


export  function parseObject(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  let key: string;
  let val: unknown;
  for (key in obj) {
    val = parseValue(obj[key] as string);
    if (val !== null) result[key] = val; // ignore null values
  }
  return result;
}

export function parseArray(arr: unknown[]) {
  const result: unknown[] = [];
  for (let i = 0; i < arr.length; i++) {
    result[i] = parseValue(arr[i] as string);
  }
  return result;
}

function parseNumber(val: unknown) {
  return Number(val);
}

function parseBoolean(val: unknown) {
  return val === "true";
}
