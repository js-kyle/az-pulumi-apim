# az-pulumi-apim

Minimal example of using the Pulumi IaC tool to deploy an Azure API Management service on the consumption tier, with an Azure Function backend. Azure free tier friendly.

## Installation

Install [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli), then login.

```bash
az login
```

Install [Pulumi](https://www.pulumi.com/docs/get-started/install)

## Usage

Deploy or update infrastructure
```bash
cd pulumi
npm i
pulumi up
```

Remove infrastructure
```bash
cd pulumi
npm i
pulumi down
```
