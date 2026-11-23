export class NextResponse extends Response {
  static json(body, init) { return Response.json(body, init); }
  static next() { return new Response(null, { status: 200, headers: { "x-middleware-next": "1" } }); }
  static redirect(url) { return new Response(null, { status: 307, headers: { location: String(url.href || url) } }); }
}
