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

export const expectedJob1Result = {
  baseURL: 'https://business.adobe.com',
  options: {
    enableJavascript: false
  },
  status: 'COMPLETE',
  urlCount: 2,
  successCount: 2,
  failedCount: 0,
  redirectCount: 0,
  hasCustomHeaders: false,
  hasCustomImportJs: false
};

export const expectedJob2ResultCustomImportJs = {
  baseURL: 'https://business.adobe.com',
  options: {
    enableJavascript: false
  },
  status: 'COMPLETE',
  urlCount: 2,
  successCount: 2,
  failedCount: 0,
  redirectCount: 0,
  hasCustomHeaders: false,
  hasCustomImportJs: true
};
