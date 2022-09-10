import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";
import { getConnectionString, signedBlobReadUrl } from "./helpers";

// Create an Azure Resource Group
const resourceGroup = new azure_native.resources.ResourceGroup("az-pulumi-apim", {
    resourceGroupName: "az-pulumi-apim",
});

// Create an API Management on consumption/Serverless tier
const apiManagementService = new azure_native.apimanagement.ApiManagementService("az-pulumi-apim-apimgmt", {
    apiVersionConstraint: {
        minApiVersion: "2019-01-01",
    },
    publisherEmail: "kyle.martin@example.com",
    publisherName: "Kyle Martin",
    resourceGroupName: resourceGroup.name,
    serviceName: "az-pulumi-apim-apimgmt",
    sku: {
        capacity: 0,
        name: "Consumption",
    },
    virtualNetworkType: "None",
});

// Storage account is required by Function App for code storage and event trigger binding
const storageAccount = new azure_native.storage.StorageAccount("sa", {
    accountName: "azpulumiapimblob",
    resourceGroupName: resourceGroup.name,
    sku: {
        name: azure_native.storage.SkuName.Standard_LRS,
    },
    kind: azure_native.storage.Kind.StorageV2,
});

// Function code archives will be stored in this container.
const codeContainer = new azure_native.storage.BlobContainer("zips", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
});

// Upload Azure Function's code as a zip archive to the storage account.
const codeBlob = new azure_native.storage.Blob("zip", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: codeContainer.name,
    source: new pulumi.asset.FileArchive("../app"),
});


const plan = new azure_native.web.AppServicePlan("plan", {
    name: "az-pulumi-apim-asp",
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "Y1",
        tier: "Dynamic",
    },
});

// Build the connection string and zip archive's SAS URL. They will go to Function App's settings.
const storageConnectionString = getConnectionString(resourceGroup.name, storageAccount.name);
const codeBlobUrl = signedBlobReadUrl(codeBlob, codeContainer, storageAccount, resourceGroup);

const app = new azure_native.web.WebApp("fa", {
    name: "az-pulumi-apim-app",
    resourceGroupName: resourceGroup.name,
    serverFarmId: plan.id,
    kind: "functionapp",
    siteConfig: {
        appSettings: [
            { name: "AzureWebJobsStorage", value: storageConnectionString },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" },
            { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~14" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: codeBlobUrl },
        ],
        http20Enabled: true,
        nodeVersion: "~14",
    },
});

const api = new azure_native.apimanagement.Api("api", {
    apiId: "Example",
    description: "Example API Deployed using Pulumi",
    displayName: "Example API",
    path: "/pulumi",
    protocols: [
        azure_native.apimanagement.Protocol.Https,
    ],
    resourceGroupName: resourceGroup.name,
    serviceName: apiManagementService.name,
    serviceUrl: pulumi.interpolate`https://${app.defaultHostName}/api/app`,
});

const apiOperation = new azure_native.apimanagement.ApiOperation("apiOperation", {
    apiId: "Example",
    description: "Returns hello world",
    displayName: "Hello World",
    method: "GET",
    resourceGroupName: resourceGroup.name,
    responses: [{
        description: "Successful operation",
        headers: [],
        representations: [
            {
                contentType: "application/json",
            },
        ],
        statusCode: 200,
    }],
    serviceName: apiManagementService.name,
    urlTemplate: "/",
});

export const endpoint = pulumi.interpolate`${apiManagementService.gatewayUrl}/pulumi?name=Pulumi`
