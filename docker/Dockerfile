# syntax=docker/dockerfile:1
# Imagem do mapin-ted (LAGEAMB): site estático (HTML/CSS/JS) servido pelo nginx.
# media/ e overlays/ (~0,9 GB) NÃO entram na imagem: ficam no bucket S3 (Ceph RGW)
# lageamb-mapin-ted, no prefixo da versão (ex.: v1.0/), e o nginx faz proxy.
#
# Contexto de build = raiz do repositório:
#   docker build -f docker/Dockerfile --build-arg ASSETS_VERSION=v1.0 \
#     -t registry.ufpr.br/lageamb/mapin-ted:1.30.6-v1.0 .

# Base nginx da CSOFT (docker-base-images): nginx-unprivileged (uid 101, porta 8080),
# com os perfis de configuração em /opt/nginx-confs/ (não ativados).
# Mesma base do nginx-glpi/nginx-wordpress (CHANGELOG de docker-base-images).
ARG BASE_IMAGE=registry.ufpr.br/dtic/csoft/docker-base-images/nginx:1.30.6-alpine-v1.1

# --- Estágio 1: conteúdo publicável + configuração do nginx ------------------
FROM ${BASE_IMAGE} AS conteudo
USER root

# Endpoint S3 (VIP do ingress do RGW s3-prod), bucket e versão dos arquivos.
# A versão fica gravada na imagem: promover a imagem promove também o conjunto
# de mídia/camadas que ela usa.
ARG S3_HOST=10.200.10.45:80
ARG S3_BUCKET=lageamb-mapin-ted
ARG ASSETS_VERSION=v1.0

WORKDIR /site
COPY index.html ted_map.json ./
COPY css/     ./css/
COPY scripts/ ./scripts/
COPY markers/ ./markers/
RUN chmod -R a=rX /site

COPY docker/nginx/default.conf docker/nginx/s3-proxy.inc /tmp/nginx/
RUN sed -i -e "s|@S3_HOST@|${S3_HOST}|g" \
           -e "s|@S3_BUCKET@|${S3_BUCKET}|g" \
           -e "s|@ASSETS_VERSION@|${ASSETS_VERSION}|g" \
           /tmp/nginx/default.conf /tmp/nginx/s3-proxy.inc \
 && ! grep -q '@[A-Z_]*@' /tmp/nginx/default.conf /tmp/nginx/s3-proxy.inc \
 && chmod 444 /tmp/nginx/*

# --- Estágio 2: imagem final -------------------------------------------------
FROM ${BASE_IMAGE}
ARG ASSETS_VERSION=v1.0
LABEL org.opencontainers.image.title="mapin-ted" \
      org.opencontainers.image.description="Story map TED INCRA/UFPR (LAGEAMB) - site estático" \
      org.opencontainers.image.source="https://gitlab.ufpr.br/lageamb/mapin-ted" \
      org.opencontainers.image.vendor="UFPR" \
      br.ufpr.mapin-ted.assets-version="${ASSETS_VERSION}"

COPY --from=conteudo /tmp/nginx/default.conf /tmp/nginx/s3-proxy.inc /etc/nginx/conf.d/
COPY --from=conteudo /site/ /usr/share/nginx/html/

USER 101
EXPOSE 8080
