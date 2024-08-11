/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { context as h2, h1 } from '@adobe/fetch';
import { DELIVERY_TYPES } from '@adobe/spacecat-shared-data-access/src/models/site.js';
import { getClient, CONTENT_TYPES } from '@adobe/spececat-helix-context-sdk';
import yaml from 'js-yaml';

/* c8 ignore next 3 */
export const { fetch } = process.env.HELIX_FETCH_FORCE_HTTP1
  ? h1()
  : h2();

export const GOOGLE_DRIVE = 'google-drive';
export const MICROSOFT_SHAREPOINT = 'sharepoint';
export const SITE_ROOT = 'sites';

/**
 * Checks if the url parameter "url" equals "ALL".
 * @param {string} url - URL parameter.
 * @returns {boolean} True if url equals "ALL", false otherwise.
 */
export const isAuditForAllUrls = (url) => url.toUpperCase() === 'ALL';

/**
 * Checks if the deliveryType parameter "deliveryType" equals "ALL".
 * @param {string} deliveryType - deliveryType parameter.
 * @returns {boolean} True if deliveryType equals "ALL", false otherwise.
 */
export const isAuditForAllDeliveryTypes = (deliveryType) => deliveryType.toUpperCase() === 'ALL';

/**
 * Sends an audit message for a single URL.
 *
 * @param {Object} sqs - The SQS service object.
 * @param {string} queueUrl - The SQS queue URL.
 * @param {string} type - The type of audit.
 * @param {Object} auditContext - The audit context object.
 * @param {string} siteId - The site ID to audit.
 * @returns {Promise} A promise representing the message sending operation.
 */
export const sendAuditMessage = async (
  sqs,
  queueUrl,
  type,
  auditContext,
  siteId,
) => sqs.sendMessage(queueUrl, { type, url: siteId, auditContext });

// todo: prototype - untested
/* c8 ignore start */
export const sendExperimentationCandidatesMessage = async (
  sqs,
  queueUrl,
  url,
  slackContext,
) => sqs.sendMessage(queueUrl, {
  processingType: 'experimentation-candidates-desktop',
  urls: [{ url }],
  slackContext,
});
/* c8 ignore end */

// todo: prototype - untested
/* c8 ignore start */
export const sendRunImportMessage = async (
  sqs,
  queueUrl,
  importType,
  siteId,
  startDate,
  endDate,
  slackContext,
) => sqs.sendMessage(queueUrl, {
  type: importType,
  siteId,
  startDate,
  endDate,
  slackContext,
});
/* c8 ignore end */

/**
 * Sends audit messages for each URL.
 *
 * @param {Object} sqs - The SQS service object.
 * @param {string} queueUrl - The SQS queue URL.
 * @param {string} type - The type of audit.
 * @param {Object} auditContext - The audit context object.
 * @param {Array<string>} siteIDsToAudit - An array of site IDs to audit.
 * @returns {Promise<string>} A promise that resolves to a status message.
 */
export const sendAuditMessages = async (
  sqs,
  queueUrl,
  type,
  auditContext,
  siteIDsToAudit,
) => {
  for (const siteId of siteIDsToAudit) {
    // eslint-disable-next-line no-await-in-loop
    await sendAuditMessage(sqs, queueUrl, type, auditContext, siteId);
  }
  return `Triggered ${type} audit for ${siteIDsToAudit.length > 1 ? `all ${siteIDsToAudit.length} sites` : siteIDsToAudit[0]}`;
};

/**
 * Triggers an audit for a site.
 * @param {Site} site - The site to audit.
 * @param {string} auditType - The type of audit.
 * @param {Object} slackContext - The Slack context object.
 * @param {Object} lambdaContext - The Lambda context object.
 * @return {Promise} - A promise representing the audit trigger operation.
 */
export const triggerAuditForSite = async (
  site,
  auditType,
  slackContext,
  lambdaContext,
) => sendAuditMessage(
  lambdaContext.sqs,
  lambdaContext.env.AUDIT_JOBS_QUEUE_URL,
  auditType,
  {
    slackContext: {
      channelId: slackContext.channelId,
      threadTs: slackContext.threadTs,
    },
  },
  site.getId(),
);

// todo: prototype - untested
/* c8 ignore start */
export const triggerExperimentationCandidates = async (
  url,
  slackContext,
  lambdaContext,
) => sendExperimentationCandidatesMessage(
  lambdaContext.sqs,
  lambdaContext.env.SCRAPING_JOBS_QUEUE_URL,
  url,
  {
    channelId: slackContext.channelId,
    threadTs: slackContext.threadTs,
  },
);
/* c8 ignore end */

// todo: prototype - untested
/* c8 ignore start */
export const triggerImportRun = async (
  config,
  importType,
  siteId,
  startDate,
  endDate,
  slackContext,
  lambdaContext,
) => sendRunImportMessage(
  lambdaContext.sqs,
  config.getQueues().imports,
  importType,
  siteId,
  startDate,
  endDate,
  {
    channelId: slackContext.channelId,
    threadTs: slackContext.threadTs,
  },
);
/* c8 ignore end */

/**
 * Checks if a given URL corresponds to a Helix site.
 * @param {string} url - The URL to check.
 * @param {Object} [edgeConfig] - The optional edge configuration object.
 * @param {string} edgeConfig.hlxVersion - The Helix version of the site
 * @param {string} edgeConfig.cdnProdHostname - The CDN production hostname of the site
 * @param {string} edgeConfig.rso - The Helix Ref/Site/Owner information
 * @param {string} edgeConfig.rso.owner - The owner of the site
 * @param {string} edgeConfig.rso.ref - The ref of the site
 * @param {string} edgeConfig.rso.site - The name of the site
 * @returns {Promise<{ isHelix: boolean, reason?: string }>} A Promise that resolves to an object
 * containing the result of the Helix site check and an optional reason if it's not a Helix site.
 */
// todo: leverage the edgeConfig for alternate verification (e.g. due to bot protection)
// eslint-disable-next-line no-unused-vars
export async function isHelixSite(url, edgeConfig = {}) {
  let resp;
  try {
    resp = await fetch(url);
  } catch (e) {
    return {
      isHelix: false,
      reason: `Cannot fetch the site due to ${e.message}`,
    };
  }

  const dom = await resp.text();
  const { status } = resp;
  const headers = resp.headers.plain();

  const containsHelixDom = /<header><\/header>\s*<main>\s*<div>/.test(dom);

  if (!containsHelixDom) {
    return {
      isHelix: false,
      // if the DOM is not in helix format, log the response status, headers and first 100 chars
      // of <body> for debugging purposes
      reason: `DOM is not in helix format. Status: ${status}. Response headers: ${JSON.stringify(headers)}. Body: ${dom.includes('<body>') ? dom.substring(dom.indexOf('<body>'), dom.indexOf('<body>') + 100) : ''}`,
    };
  }

  return {
    isHelix: true,
  };
}

/**
 * Checks if a given URL corresponds to an AEM site.
 * @param {string} url - The URL to check.
 * @returns {Promise<{ isAEM: boolean, reason: string }>} A Promise that resolves to an object
 * containing the result of the AEM site check and a reason if it's not an AEM site.
 */
export async function isAEMSite(url) {
  let pageContent;
  try {
    const response = await fetch(url);
    pageContent = await response.text();
  } catch (e) {
    return {
      isAEM: false,
      reason: `Cannot fetch the site due to ${e.message}`,
    };
  }

  const aemTokens = ['/content/dam/', '/etc.clientlibs', 'cq:template', 'sling.resourceType'];
  const isAEM = aemTokens.some((token) => pageContent.includes(token));

  return {
    isAEM,
    reason: 'Does not contain AEM paths or meta properties',
  };
}

/**
 * Finds the delivery type of the site, url of which is provided.
 * @param {string} url - url of the site to find the delivery type for.
 * @returns {Promise<"aem_edge" | "aem_cs" | "others">} A Promise that resolves to the delivery type
 */
export async function findDeliveryType(url) {
  const { isHelix } = await isHelixSite(url);
  if (isHelix) {
    return DELIVERY_TYPES.AEM_EDGE;
  }

  const { isAEM } = await isAEMSite(url);
  if (isAEM) {
    return DELIVERY_TYPES.AEM_CS;
  }

  return DELIVERY_TYPES.OTHER;
}

async function getGithubMountpoint(site) {
  const githubURL = site.getGithubURL();
  const fstabResponse = await fetch(`${githubURL}/blob/main/fstab.yaml`);
  const fstabContent = await fstabResponse.text();

  const parsedContent = yaml.load(fstabContent);

  // Extract the first mountpoint
  const firstMountpoint = Object.entries(parsedContent.mountpoints)[0];

  return firstMountpoint;
}

async function getMountpoint(site) {
  const hlxCfg = site.getHlxConfig();
  if (hlxCfg?.content?.source?.url) {
    return hlxCfg?.content?.source?.url;
  }
  return getGithubMountpoint(site);
}

async function getMicrosoftClient(env, mountpoint) {
  const mountPointURL = new URL(mountpoint);
  const domain = mountPointURL.hostname;
  const rootPath = mountPointURL.pathname;
  return getClient({
    type: CONTENT_TYPES.MICROSOFT_SHAREPOINT,
    authConfig: {
      auth: {
        authority: env.SHAREPOINT_AUTHORITY,
        clientId: env.SHAREPOINT_CLIENT_ID,
        clientSecret: env.SHAREPOINT_CLIENT_SECRET,
      },
    },
    documentStoreConfig: {
      domain, /* Your sharepoint domain, i.e. 'adobe.sharepoint.com' */
      domainId: env.ADOBE_SHAREPOINT_DOMAIN_ID, /* you can get it from the graph explorer */
      rootPath,
    },
  });
}

async function getGDriveClient(env, mountpoint) {
  const mountpointURL = new URL(mountpoint);
  const pathSegments = mountpointURL.pathname.split('/').filter((segment) => segment);
  const driveId = pathSegments[pathSegments.length - 1];
  return getClient({
    type: CONTENT_TYPES.GOOGLE_DRIVE,
    authConfig: {
      keyFile: env.KEY_FILE,
    },
    documentStoreConfig: {
      driveId, /* The id for the project root folder (take it from the project's fstab.yaml) */
    },
  });
}

export async function getContentClient(env, site) {
  const mountpoint = getMountpoint(site);
  if (mountpoint.includes(GOOGLE_DRIVE)) {
    return getGDriveClient(env, mountpoint);
  }
  if (mountpoint.includes(MICROSOFT_SHAREPOINT)) {
    return getMicrosoftClient(env, mountpoint);
  }
  throw new Error('Unknown content type client');
}

export async function publishToHelixAdmin(owner, repo, ref, path) {
  const url = `https://admin.hlx.page/live/${owner}/${repo}/${ref}/${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to publish resource ${path} : ${response.statusText}`);
  }

  return response.json();
}

/**
 * Error class with a status code property.
 * @extends Error
 */
export class ErrorWithStatusCode extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
