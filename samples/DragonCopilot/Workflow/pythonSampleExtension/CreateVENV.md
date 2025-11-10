## (Optional) Create venv
```shell
pwd;
pushd $HOME/Code/VCS/ai/llm-train;

VERSION="3.12";
ENV_NAME="dgext";
ENV_SUFFIX="pip";
ENV_FULL_NAME="${ENV_NAME}${VERSION}${ENV_SUFFIX}";
ENV_DIR="$HOME/Code/VENV";
source ./envtools/create_env.sh -p "${ENV_DIR}/${ENV_FULL_NAME}" -v $VERSION;

popd;
pwd;
```

## Activate venv
```shell
VERSION="3.12";
ENV_NAME="dgext";
ENV_SUFFIX="pip";

ENV_FULL_NAME="${ENV_NAME}${VERSION}${ENV_SUFFIX}";

ENV_DIR="$HOME/Code/VENV";
PROJ_DIR="$HOME/Code/VCS/dragon/dragon-copilot-extension-samples";

SUB_PROJ="samples/DragonCopilot/Workflow/pythonSampleExtension";
PACKAGE_FILE="${PROJ_DIR}/${SUB_PROJ}/requirements.txt";

source ${ENV_DIR}/${ENV_FULL_NAME}/bin/activate;
which python3;

python3 -m pip install --upgrade pip;
python3 -m pip install -r ${PACKAGE_FILE} --no-cache;
```