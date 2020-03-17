export interface ParserState {
  source: string;
  pos: number;
  token: string | number;
  tokenValue: string;
}
