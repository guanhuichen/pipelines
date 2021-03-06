/**
 * Copyright 2021 The Kubeflow Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useLayoutEffect, useContext, useRef } from 'react';
import { logger } from './Utils';

declare global {
  interface Window {
    // Provided by:
    // 1. https://github.com/kubeflow/kubeflow/tree/master/components/centraldashboard#client-side-library
    // 2. /frontend/server/server.ts -> KUBEFLOW_CLIENT_PLACEHOLDER
    centraldashboard: any;
  }
}

let namespace: string | undefined;
let registeredHandler: undefined | ((namespace: string) => void);
function onNamespaceChanged(handler: (namespace: string) => void) {
  registeredHandler = handler;
}

export function init(): void {
  try {
    // Init method will invoke the callback with the event handler instance
    // and a boolean indicating whether the page is iframed or not
    window.centraldashboard.CentralDashboardEventHandler.init((cdeh: any) => {
      // Binds a callback that gets invoked anytime the Dashboard's
      // namespace is changed
      cdeh.onNamespaceSelected = (newNamespace: string) => {
        namespace = newNamespace;
        if (registeredHandler) {
          registeredHandler(namespace);
        }
      };
    });
  } catch (err) {
    logger.error('Failed to initialize central dashboard client', err);
  }
}

export const NamespaceContext = React.createContext<string | undefined>(undefined);
export class NamespaceContextProvider extends React.Component {
  state = {
    namespace,
  };
  componentDidMount() {
    onNamespaceChanged(ns => this.setState({ namespace: ns }));
  }
  render() {
    return <NamespaceContext.Provider value={this.state.namespace} {...this.props} />;
  }
}

function usePrevious<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function useNamespaceChangeEvent(): boolean {
  const currentNamespace = useContext(NamespaceContext);
  const previousNamespace = usePrevious(currentNamespace);

  if (!previousNamespace) {
    // Previous namespace hasn't been initialized, this does not count as a change.
    // When the webapp inits, the first render will have namespace=undefined, so
    // this situation happens often.
    return false;
  }

  return previousNamespace !== currentNamespace;
}
