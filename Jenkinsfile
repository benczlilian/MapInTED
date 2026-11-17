// mapin-ted (LAGEAMB): build da imagem e MR de produção no gitops.
//
// Fluxo (só produção, sem teste/homologação):
//   1. build da candidata <APP_VERSION>-build-N (Kaniko, docker/Dockerfile)
//   2. confere se a mídia/camadas da versão ASSETS_VERSION já estão no bucket
//   3. publica a candidata como <APP_VERSION> (skopeo, mesmo digest; nunca sobrescreve)
//   4. abre MR em gitops-estaticos-lageamb/overlays/mapin-ted-prod
// A produção só muda depois da aprovação da CHARD (CODEOWNERS) e do Sync manual.
//
// Mudou o site? Suba APP_VERSION (v1.0 -> v1.1). Mudou media/ ou overlays/?
// Envie-os antes para um prefixo novo do bucket e suba também ASSETS_VERSION.
pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-lageamb-mapin-ted
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ["sleep"]
    args: ["infinity"]
    volumeMounts:
    - name: registry-secret
      mountPath: /kaniko/.docker
  - name: skopeo
    image: quay.io/skopeo/stable:v1.16.1
    command: ["sleep"]
    args: ["infinity"]
    env:
    - name: REGISTRY_AUTH_FILE
      value: /docker/config.json
    volumeMounts:
    - name: registry-secret
      mountPath: /docker
      readOnly: true
  - name: git-kustomize
    image: alpine/k8s:1.30.0
    command: ["sleep"]
    args: ["infinity"]
  volumes:
  # Conta de servico jenkins-ci: le a base em dtic/csoft e envia para lageamb
  - name: registry-secret
    projected:
      sources:
      - secret:
          name: regcred-lageamb
          items:
          - key: .dockerconfigjson
            path: config.json
'''
        }
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }

    environment {
        IMAGE          = 'registry.ufpr.br/lageamb/mapin-ted'
        APP_VERSION    = '1.30.6-v1.0'          // <versao do nginx da base>-v<revisao do site>
        ASSETS_VERSION = 'v1.0'                 // prefixo de media/ e overlays/ no bucket
        IMAGE_TAG      = "${APP_VERSION}-build-${BUILD_NUMBER}"
        S3_PUBLICO     = 'http://10.200.10.45/lageamb-mapin-ted'
        GITOPS_REPO    = 'gitlab.ufpr.br/dtic/chard/gitops-estaticos-lageamb.git'
        OVERLAY        = 'overlays/mapin-ted-prod'
    }

    stages {
        stage('1. Checkout') {
            steps {
                checkout scm
            }
        }

        stage('2. Conferir arquivos no bucket') {
            steps {
                container('git-kustomize') {
                    // A imagem aponta para ASSETS_VERSION: sem os arquivos no bucket
                    // o site sobe sem video e sem mapa.
                    sh '''
                        set -e
                        for obj in media/TED_SO.mp4 overlays/PAs/0/0/0.pbf; do
                          curl -fsI "$S3_PUBLICO/$ASSETS_VERSION/$obj" > /dev/null \
                            || { echo "ERRO: $obj nao existe em $S3_PUBLICO/$ASSETS_VERSION/ (envie com aws s3 sync)"; exit 1; }
                          echo "OK: $ASSETS_VERSION/$obj"
                        done
                    '''
                }
            }
        }

        stage('3. Build e push da candidata (Kaniko)') {
            steps {
                container('kaniko') {
                    sh '''
                        /kaniko/executor \
                          --context=dir://. \
                          --dockerfile=docker/Dockerfile \
                          --build-arg ASSETS_VERSION=${ASSETS_VERSION} \
                          --label org.opencontainers.image.revision=${GIT_COMMIT} \
                          --destination=${IMAGE}:${IMAGE_TAG}
                    '''
                }
            }
        }

        stage('4. Baixar scripts do gitops') {
            steps {
                container('git-kustomize') {
                    withCredentials([usernamePassword(credentialsId: 'gitlab-gitops-estaticos-lageamb-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh '''
                            set -e
                            rm -rf repo-gitops
                            git clone -q --depth 1 "https://${GIT_USER}:${GIT_PASS}@${GITOPS_REPO}" repo-gitops
                        '''
                    }
                }
            }
        }

        stage('5. Publicar versao (skopeo)') {
            steps {
                container('skopeo') {
                    // Copia -build-N para APP_VERSION preservando o digest. Se a
                    // versao ja existir com outro conteudo, falha: suba APP_VERSION.
                    sh 'sh repo-gitops/ci/publicar-versao.sh "$IMAGE" "$IMAGE_TAG" "$APP_VERSION"'
                }
            }
        }

        stage('6. Abrir MR na producao') {
            steps {
                container('git-kustomize') {
                    withCredentials([usernamePassword(credentialsId: 'gitlab-gitops-estaticos-lageamb-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        script {
                            def desc = "mapin-ted ${env.APP_VERSION} (candidata ${env.IMAGE_TAG}; digest ${readFile('.promocao/mapin-ted.digest')}; commit ${readFile('.promocao/mapin-ted.revisao')}; arquivos do bucket: ${env.ASSETS_VERSION}). Exige aprovacao da CHARD (CODEOWNERS) e Sync manual no ArgoCD."
                            withEnv(["DESCRICAO=${desc}"]) {
                                sh 'sh repo-gitops/ci/abrir-mr.sh "$OVERLAY" producao "$IMAGE:$APP_VERSION"'
                            }
                            currentBuild.description = "mapin-ted:${env.APP_VERSION} (assets ${env.ASSETS_VERSION})"
                        }
                    }
                }
            }
        }
    }
}
