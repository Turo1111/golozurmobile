import { useState, useEffect } from 'react';

function useFilteredArray(dataArray, input) {
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (input) {
      const filtered = dataArray.filter(item => 
        item.descripcion.toLowerCase().includes(input.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(dataArray);
    }
  }, [dataArray, input]);

  return filteredData;
}

export default useFilteredArray;
