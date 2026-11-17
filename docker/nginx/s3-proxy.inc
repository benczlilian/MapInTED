# Parâmetros comuns do proxy para o RGW (bucket em path-style).
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_set_header Host @S3_HOST@;
proxy_set_header Authorization "";
proxy_set_header Cookie "";

# Não expõe detalhes do Ceph para o navegador.
proxy_hide_header x-amz-request-id;
proxy_hide_header x-amz-id-2;
proxy_hide_header x-rgw-object-type;
proxy_hide_header x-amz-mp-parts-count;
proxy_hide_header Set-Cookie;
proxy_ignore_headers Set-Cookie;

# Sem ListBucket, o RGW responde 403 para objeto inexistente: devolve 404.
proxy_intercept_errors on;
error_page 403 = @nao_encontrado;

proxy_connect_timeout 5s;
proxy_read_timeout 60s;
# Se um RGW atrás do VIP falhar, tenta de novo (só para GET/HEAD).
proxy_next_upstream error timeout http_502 http_503 http_504;
