xquery version "1.0-ml";

(:
 : This extension supports the sidebar.js type-ahead feature. Once deployed,
 : configure type-ahead by including "otherURL: '/v1/resources/ele-value-match'"
 : in a facet's configuration.
 :
 : Deploy with:
 : $ curl --anyauth --user user:password -X PUT \
       -H "Content-type: application/xquery" -d@"./ele-value-match.xqy" \
       "http://localhost:<port>/v1/config/resources/ele-value-match?title=Element Value Match&version=1.0&provider=marklogic&description=Executes an element-value-match call&method=get&get:ns=xs:string&get:element=xs:string&get:q=xs:string"
 :)

module namespace evm = "http://marklogic.com/rest-api/resource/ele-value-match";

declare namespace roxy = "http://marklogic.com/roxy";

(:
 : To add parameters to the functions, specify them in the params annotations.
 : Example
 :   declare %roxy:params("uri=xs:string", "priority=xs:int") evm:get(...)
 : This means that the get function will take two parameters, a string and an int.
 :)

(:
 :)
declare
%roxy:params("ns=xs:string", "element=xs:string", "q=xs:string")
function evm:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),
  document {
    '[' ||
      fn:string-join(
        for $value in cts:element-value-match(fn:QName(map:get($params, "ns"), map:get($params, "element")), map:get($params, "q") || "*")[1 to 10]
        return ('"' || $value || '"'),
        ", "
      )
    || ']'
  }
};
