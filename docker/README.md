# Imagem do mapin-ted

Site estático (HTML, CSS, JS) servido pelo nginx não privilegiado da CSOFT
(`docker-base-images/nginx:1.30.6-alpine-v1.1`, uid 101, porta 8080). Sem PHP e sem build de front-end.

| Arquivo | Função |
|---|---|
| `Dockerfile` | Copia só HTML/CSS/JS (sem `media/` e `overlays/`), preenche a config do nginx com endpoint/bucket/versão e deixa tudo somente leitura |
| `nginx/default.conf` | Modelo (marcadores `@...@`): gzip, cache por pasta, cabeçalhos de segurança, proxy de `/media/` e `/overlays/` para o bucket, `/healthz` |
| `nginx/s3-proxy.inc` | Parâmetros comuns do proxy para o RGW (path-style, só GET/HEAD, esconde cabeçalhos do Ceph, 403 → 404) |

## Arquivos no bucket

`media/` e `overlays/` (~0,9 GB) ficam no bucket `lageamb-mapin-ted` do Ceph RGW
(VIP do ingress `10.200.10.45:80`), num prefixo por versão do site (`v1.0/`, `v1.1/`...).
A versão é fixada no build (`--build-arg ASSETS_VERSION=v1.0`) e gravada na imagem:
promover a imagem promove o conjunto de arquivos junto. Um prefixo publicado nunca é
sobrescrito — conteúdo novo vai para um prefixo novo.

## Build e teste local

Rodar na raiz do repositório (o contexto é a raiz, não a pasta `docker/`):

```bash
docker build -f docker/Dockerfile --build-arg ASSETS_VERSION=v1.0 -t registry.ufpr.br/lageamb/mapin-ted:1.30.6-v1.0 .

# mesmo modo do Kubernetes: raiz somente leitura, /tmp e /var/cache/nginx graváveis
docker run --rm --read-only --tmpfs /tmp --tmpfs /var/cache/nginx -p 8080:8080 registry.ufpr.br/lageamb/mapin-ted:1.30.6-v1.0
curl -I http://localhost:8080/healthz
curl -sI -H 'Accept-Encoding: gzip' http://localhost:8080/overlays/PAs/0/0/0.pbf | grep -iE 'content-(type|encoding)'
```

## Tags

`<versão do nginx da base>-v<revisão do site>`, como o `nginx-glpi`:

- candidata (teste): `1.30.6-v1.0-build-<N>`
- versão (homologação/produção): `1.30.6-v1.0`

A revisão (`v1.0`, `v1.1`...) sobe a cada mudança de conteúdo; a parte `1.30.6`
só muda quando a base nginx mudar.

## Pendências conhecidas

- O vídeo referenciado em `scripts/story-mapTED.js` é `media/TED_SO.mp4`, mas o
  arquivo é `media/TED_SO.MP4` (404 em Linux).
- Bibliotecas `scrollama`, `georaster` e `georaster-layer-for-leaflet` são
  carregadas do unpkg sem versão fixa.
- As chaves Google/MapTiler ficam no JS (inevitável em site estático):
  restringir por referrer nos consoles dos provedores.
- O RGW é acessado por HTTP (sem TLS) dentro da rede do datacenter.
