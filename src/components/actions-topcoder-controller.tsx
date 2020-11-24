import React from 'react';
import { createOrUpdateChallenge } from '../services/challenges';
import { WEBSITE } from '../config';

export default function ActionsTopcoderController() {

  const buildWorkItemUrl = (id: string) => {
    return 'https://dev.azure.com/' +
      VSS.getWebContext().host.name + '/' +
      VSS.getWebContext().project.name + '/_workitems/edit/' + id;
  };

  React.useEffect(() => {
    const createTopcoderChallenge = (
      id: string,
      title: string,
      body: string
    ) => {
      (async function run() {
        let isProcessed = false;
        const dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
        const projectId = await dataService.getValue(VSS.getWebContext().project.id + '_TOPCODER_PROJECT', {scopeType: 'User'});
        if (projectId) {
          var bodyWithRef = body + '\n\n### Reference ' + buildWorkItemUrl(id);
          const res = await createOrUpdateChallenge({
            name: title,
            detailedRequirements: bodyWithRef,
            projectId,
            prize: 0
          });
          window.open(`${WEBSITE}/challenges/${res.data.id}`, "_blank");
          await dataService.setValue(VSS.getWebContext().project.id + '_' + id, res.data.id, {scopeType: 'User'});
          isProcessed = true;
        }
        if (!isProcessed) {
          alert('No topcoder project configured. Please configure at Topcoder X Hub -> Account.');
        }
      })();
    };

    VSS.require(["TFS/WorkItemTracking/Services"], function (_WorkItemServices: any) {
      // Register a listener for the work item group contribution.
      function getWorkItemFormService() {
          return _WorkItemServices.WorkItemFormService.getService();
      }

      var menuContributionHandler = (function () {
        return {
          // This is a callback that gets invoked when a user clicks the newly contributed menu item
          // The actionContext parameter contains context data surrounding the circumstances of this
          // action getting invoked.
          execute: function (actionContext: any) {
            getWorkItemFormService().then(function(service: any) {
              // Get the current values for a few of the common fields
              service.getFieldValues(["System.Id", "System.Title", "System.Description", "System.Tags"]).then(
                function (value: any) {
                  if (!value["System.Id"]) {
                    alert('Unable to send unsaved work items. Please save it first.');
                  }
                  else {
                    createTopcoderChallenge(value["System.Id"], value["System.Title"], value["System.Description"]);
                  }
              });
            });
          }
        };
      }());

      VSS.register("tcx-workitem-send-topcoder", menuContributionHandler);
      VSS.notifyLoadSucceeded();
    });
  }, []);

  return (
    <div>
    </div>
  );
}
