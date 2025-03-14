import type { InfiniteData, QueryKey } from '@tanstack/react-query';
import type { FeedData } from '../../graphql/posts';
import type { ContentPreferenceMutation } from '../../hooks/contentPreference/types';
import {
  contentPreferenceMutationMatcher,
  mutationKeyToContentPreferenceStatusMap,
} from '../../hooks/contentPreference/types';
import { useMutationSubscription } from '../../hooks/mutationSubscription/useMutationSubscription';
import type { RequestKey } from '../../lib/query';
import { updatePostContentPreference } from '../../lib/query';
import type { PropsParameters } from '../../types';

type UseFeedContentPreferenceMutationSubscriptionProps = {
  feedQueryKey: QueryKey;
};

type UseFeedContentPreferenceMutationSubscription = ReturnType<
  typeof useMutationSubscription
>;

export const useFeedContentPreferenceMutationSubscription = ({
  feedQueryKey,
}: UseFeedContentPreferenceMutationSubscriptionProps): UseFeedContentPreferenceMutationSubscription => {
  return useMutationSubscription({
    matcher: contentPreferenceMutationMatcher,
    callback: ({
      mutation,
      variables: mutationVariables,
      queryClient: mutationQueryClient,
    }) => {
      const currentData = mutationQueryClient.getQueryData(feedQueryKey);
      const [requestKey] = mutation.options.mutationKey as [
        RequestKey,
        ...unknown[],
      ];

      if (!currentData) {
        return;
      }

      const nextStatus = mutationKeyToContentPreferenceStatusMap[requestKey];

      const { id: entityId, entity } =
        mutationVariables as PropsParameters<ContentPreferenceMutation>;

      mutationQueryClient.setQueryData<InfiniteData<FeedData>>(
        feedQueryKey,
        (data) => {
          const newFeedData = {
            ...data,
            pages: data.pages?.map((feedPage) => {
              return {
                page: {
                  ...feedPage.page,
                  edges: feedPage.page.edges?.map((edge) => {
                    const newPostData = updatePostContentPreference({
                      data: edge.node,
                      status: nextStatus,
                      entityId,
                      entity,
                    });

                    return {
                      ...edge,
                      node: newPostData,
                    };
                  }),
                },
              };
            }),
          };

          return newFeedData;
        },
      );
    },
  });
};
