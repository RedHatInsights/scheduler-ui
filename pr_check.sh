#!/bin/bash

set -exv

export COMPONENT="scheduler-ui"
export IMAGE="quay.io/cloudservices/scheduler-ui"

COMMON_BUILDER=https://raw.githubusercontent.com/RedHatInsights/insights-frontend-builder-common/master

export WORKSPACE=${WORKSPACE:-$APP_ROOT}
export APP_ROOT=$(pwd)
export NODE_BUILD_VERSION=20
cat /etc/redhat-release || true
COMMON_BUILDER=https://raw.githubusercontent.com/RedHatInsights/insights-frontend-builder-common/master

# source the build script
source <(curl -sSL $COMMON_BUILDER/src/frontend-build.sh)
BUILD_RESULTS=$?

# Stubbed out for now
mkdir -p artifacts
cat << EOF > artifacts/junit-dummy.xml
<testsuite tests="1">
    <testcase classname="dummy" name="dummytest"/>
</testsuite>
EOF

# teardown docker
exit $BUILD_RESULTS
