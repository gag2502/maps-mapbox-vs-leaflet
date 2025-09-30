import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Inter', Arial, sans-serif;
    background: #f1f5f9;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  button, input, select, textarea {
    font-family: inherit;
  }
`;

export default GlobalStyle;
