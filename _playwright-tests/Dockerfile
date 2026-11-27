# Self-contained Playwright test image for scheduler-ui.

ARG NODE_IMAGE_TAG=9.9-1795499639
FROM registry.access.redhat.com/ubi9/nodejs-22:${NODE_IMAGE_TAG}

# Chromium headless-shell runtime dependencies for UBI9
USER 0
RUN dnf install -y --setopt=install_weak_deps=0 --setopt=tsflags=nodocs \
      nss nspr dbus-libs atk at-spi2-atk at-spi2-core cups-libs \
      libXcomposite libXdamage libXext libXfixes libXrandr libxkbcommon \
      mesa-libgbm cairo pango alsa-lib && \
    dnf clean all && rm -rf /var/cache/dnf

USER 1001
WORKDIR /opt/app-root/src

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/app-root/src/.ms-playwright

COPY package.json package-lock.json ./
# ts-patch (postinstall) is a build-time concern of `fec build`; the Playwright
# runner loads the TS specs itself and needs no install scripts.
RUN npm ci --ignore-scripts --no-audit --no-fund && \
    npm cache clean --force && rm -rf /opt/app-root/src/.npm

RUN npx playwright install chromium --only-shell

COPY tsconfig.json playwright.config.ts playwright.auth.config.ts playwright.environment.config.ts ./
COPY playwright ./playwright

# The suites write auth storage state to playwright/.auth/ at runtime
# (OpenShift runs the image with a random UID, gid 0)
USER 0
RUN chown -R 1001:0 playwright && \
    chmod -R g+w playwright
USER 1001

ENTRYPOINT ["npx", "playwright", "test"]
