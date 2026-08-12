Controle de Ponto no celular

Este app agora está preparado como PWA, ou seja, pode ser instalado na tela inicial do celular e funcionar offline.

Importante:
Para ficar independente do computador, ele precisa ser publicado uma vez em um endereço HTTPS.
Depois de instalado no celular, os registros ficam salvos no próprio celular.

Arquivos que devem ir para a publicação:
- controle-ponto.html
- manifest.webmanifest
- service-worker.js
- icon.svg

Opções simples de publicação:
1. Netlify Drop
   Abra https://app.netlify.com/drop e envie a pasta outputs.

2. GitHub Pages
   Publique estes arquivos em um repositório e ative Pages.

3. Hospedagem comum
   Envie os arquivos para uma pasta pública do site.

Como instalar no Android:
1. Abra o link publicado no Chrome.
2. Toque no menu do navegador.
3. Toque em "Adicionar à tela inicial" ou "Instalar app".

Como instalar no iPhone:
1. Abra o link publicado no Safari.
2. Toque em compartilhar.
3. Toque em "Adicionar à Tela de Início".

Depois disso, o app abre pelo ícone do celular e não depende do computador.
