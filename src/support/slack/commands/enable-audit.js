/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import BaseCommand from './base.js';
import { extractURLFromSlackInput } from '../../../utils/slack/base.js';
import { ConfigurationDto } from '../../../dto/configuration.js';

const PHRASES = ['enable-audit'];

export default (context) => {
  const baseCommand = BaseCommand({
    id: 'sites-audits--enable-audit',
    name: 'Audit enabling test command',
    description: '',
    phrases: PHRASES,
    usageText: `${PHRASES[0]} {site} {auditType1}`,
  });

  const { dataAccess } = context;

  const handleExecution = async (args, slackContext) => {
    const { say } = slackContext;
    const [baseURLInput, auditType] = args;
    const baseURL = extractURLFromSlackInput(baseURLInput);

    const configuration = await dataAccess.getConfiguration();
    const site = await dataAccess.getSiteByBaseURL(extractURLFromSlackInput(baseURL));

    // Before update
    let isAuditEnabled = configuration.isHandlerEnabledForSite(auditType, site);
    await say(`[Before update]: Is audit enabled: ${auditType} ${isAuditEnabled}. Version: ${configuration.getVersion()}`);

    // Update
    configuration.enableHandlerForSite(auditType, site);

    const configurationData = ConfigurationDto.toJSON(configuration);
    await dataAccess.updateConfiguration(configurationData);

    // After update
    isAuditEnabled = configuration.isHandlerEnabledForSite(auditType, site);
    await say(`[After update]: Is audit enabled: ${auditType} ${isAuditEnabled}. Version: ${configuration.getVersion()}`);

    // Reload
    const reloadedConfiguration = await dataAccess.getConfiguration();
    const handlers = reloadedConfiguration.getHandlers();
    await say(`Reloaded configuration handlers: ${JSON.stringify(handlers)}`);

    const configurationJson = ConfigurationDto.toJSON(configuration);
    let handler = 'not_exist';
    if (configurationJson.handlers && configurationJson.handlers[auditType]) {
      handler = configurationJson.handlers[auditType];
    }
    await say(`Site id: "${site.getId()}", Audit type: "${auditType}", handler object: ${JSON.stringify(handler)}`);

    isAuditEnabled = reloadedConfiguration.isHandlerEnabledForSite(auditType, site);
    await say(`[After reload]: Is audit enabled: ${auditType} ${isAuditEnabled}. Version: ${reloadedConfiguration.getVersion()}`);
  };

  baseCommand.init(context);

  return {
    ...baseCommand,
    handleExecution,
  };
};
