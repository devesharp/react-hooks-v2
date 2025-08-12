function isObject(val) {
  return val.constructor === Object;
}

function isNumber(val) {
  return !isNaN(parseFloat(val)) && isFinite(val);
}

function isBoolean(val) {
  return val === "false" || val === "true";
}

function isArray(val) {
  return Array.isArray(val);
}

function isDate(val) {
  return /^\d{4}-\d{2}-\d{2}T/.test(val);
}

function parseDate(val) {
  return new Date(val);
}

function parseValue(val) {
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


export  function parseObject(obj) {
  var result = {};
  var key, val;
  for (key in obj) {
    val = parseValue(obj[key]);
    if (val !== null) result[key] = val; // ignore null values
  }
  return result;
}

export function parseArray(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    result[i] = parseValue(arr[i]);
  }
  return result;
}

function parseNumber(val) {
  return Number(val);
}

function parseBoolean(val) {
  return val === "true";
}
