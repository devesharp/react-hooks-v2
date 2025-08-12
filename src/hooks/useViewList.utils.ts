import QueryString from "qs";
import { parseObject } from "../utils/queryTypes";

export function convertObjetToQuery(object: Record<string, unknown>) {
  return QueryString.stringify(object);
}

export function convertQueryToObject(query: string) {
  return parseObject(QueryString.parse(query));
}
