# Mapas — editor de polígonos com Mapbox GL

Aplicação React + TypeScript criada com Vite para visualizar mapas em modo satélite usando Mapbox GL JS. O projeto permite desenhar novos polígonos, importar GeoJSON já existente, navegar até coordenadas específicas e exportar os dados desenhados.

## ✨ Funcionalidades

- Mapa Mapbox em visão satélite (satellite-streets).
- Ferramentas de desenho e remoção de polígonos via Mapbox GL Draw.
- Upload de arquivos GeoJSON (`FeatureCollection`) para exibir polígonos previamente definidos.
- Exportação do estado atual para um arquivo GeoJSON.
- Centralização do mapa a partir de latitude/longitude informadas.
- Controles básicos de zoom (NavigationControl padrão do Mapbox).

## 📦 Pré-requisitos

- Node.js 18 ou superior.
- Uma conta Mapbox com um token de acesso público.

## 🚀 Como começar

1. **Instale as dependências** (caso ainda não tenha feito):

   ```powershell
   npm install
   ```

2. **Configure o token do Mapbox**:

   - Copie o arquivo `.env.example` para `.env`.
   - Substitua `coloque_seu_token_aqui` pelo seu token público disponível em [account.mapbox.com](https://account.mapbox.com/access-tokens/).

   ```text
   VITE_MAPBOX_TOKEN=pk.XXXXXXXXXXXX
   ```

3. **Execute em modo desenvolvimento**:

   ```powershell
   npm run dev
   ```

   A aplicação ficará disponível em [http://localhost:5173](http://localhost:5173).

4. **Build de produção** (opcional):

   ```powershell
   npm run build
   ```

   Para conferir o build:

   ```powershell
   npm run preview
   ```

## 🗺️ Como usar

- **Desenhar polígonos**: já inicia no modo de desenho. Clique para adicionar vértices e finalize com duplo clique.
- **Importar GeoJSON**: use o seletor de arquivo para carregar uma `FeatureCollection`. Os polígonos serão exibidos e o mapa centralizado.
- **Centralizar pelo ponto**: informe latitude e longitude e clique em “Ir para coordenadas”.
- **Exportar GeoJSON**: salva um arquivo com os polígonos desenhados/importados.
- **Limpar polígonos**: remove todas as feições atuais.

## 🧰 Estrutura principal

- `src/components/MapboxMap.tsx`: componente responsável por inicializar o Mapbox, Mapbox Draw e expor utilitários via `ref`.
- `src/App.tsx`: camada de UI/controles que interage com o componente de mapa.
- `.env.example`: modelo de configuração do token Mapbox.

## 📝 Licença

Projeto livre para uso e evolução dentro da sua necessidade interna. Ajuste conforme preferir! 
