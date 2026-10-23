FROM maven:3.9.9-eclipse-temurin-21@sha256:3a4ab3276a087bf276f79cae96b1af04f53731bec53fb2e651aca79e4b10211e AS maven
FROM node:22.20.0-bookworm-slim@sha256:b21fe589dfbe5cc39365d0544b9be3f1f33f55f3c86c87a76ff65a02f8f5848e AS node
FROM jenkins/jenkins:lts-jdk21@sha256:a660310e39ade10631f774bacd5219de767dfd08947ea5c32a739b5e5bb382c1
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 curl ca-certificates git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=maven /usr/share/maven /opt/maven
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
ENV MAVEN_HOME=/opt/maven
ENV PATH=/opt/maven/bin:${PATH}
COPY ci/jenkins/plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --latest=false --plugin-file /usr/share/jenkins/ref/plugins.txt
COPY ci/jenkins/executors.groovy /usr/share/jenkins/ref/init.groovy.d/executors.groovy
COPY ci/notify_telegram.py /opt/ams-ci/notify_telegram.py
USER jenkins
RUN java -version && mvn --version && node --version && npm --version
