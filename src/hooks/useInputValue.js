import { useState } from "react"

export const useInputValue = (initialValue, onlyType) => {

  const esLetra = (caracter) => {
    let ascii = caracter.toUpperCase().charCodeAt(0);
    return ascii > 64 && ascii < 91;
  };

  const [value, setvalue] = useState(initialValue)

  const onChangeText = e => {

    if (onlyType === 'number') {
      !isNaN(e.target.value)  && setvalue(e.target.value)
    }
    if (onlyType === 'string'){
      esLetra(e.target.value) && setvalue(e.target.value)
    }
    if(onlyType === ''){
      setvalue(e)
    }
  }

  const clearValue = () => {
    setvalue('')
  }
  
  return { value, onChangeText, clearValue }
}