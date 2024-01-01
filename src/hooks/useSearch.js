
export const useSearch = (search, tags, list, tagSearch = []) => {
  

  let newList = list
  let result = []

  if (tagSearch.length !== 0) {
    tagSearch.map(
      itemTag=>{
        newList = newList.filter(itemLista=>{
          return  itemLista[itemTag.tag]?.toString().toLowerCase().indexOf(itemTag.search.toLowerCase()) !== -1
        })
      }
    )
  }

  if(search !== '' ){

    const filteredList = newList.filter(item => {
      for (const tag of tags) {
        if (tag instanceof Object) {
          const key = Object.keys(tag)[0];
          if (Array.isArray(tag[key])) {
            for (const i of tag[key]) {
              if (item[key]?.[i]?.toString().toLowerCase().includes(search.toLowerCase())) {
                return true;
              }
            }
          }
        } else {
          if (item[tag]?.toString().toLowerCase().includes(search.toLowerCase())) {
            return true;
          }
        }
      }
      return false;
    });
    
    const resultMap = {};
    
    for (const item of filteredList) {
      resultMap[item._id] = item;
    }
    
    const uniqueResults = Object.values(resultMap);
    
    return uniqueResults;

  } else {
      return newList
  }

}