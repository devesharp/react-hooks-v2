import { useView } from "./useView";
import { useViewList } from "./useViewList";


function Acompont() {
  const view = useView({
    resolves: {
      sd: () => {
        return {
          results: [],
          count: 0,
        };
      },
    },
  });

  console.log(view.resolvesResponse.sd?.results);

  const viewList = useViewList({
    resolveResources: () => {
      return {
        results: [],
        count: 0,
      };
    },
    resolves: {
      sd: () => {
        return {
          results: [],
          count: 0,
        };
      },
    },
  });

  console.log(viewList.resolvesResponse.resources?.results);
}
