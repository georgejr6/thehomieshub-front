import{d as c,A as x,R as p,T as N,P as f,g as Q,m as K,b,y,h as J,E as Y}from"./index-5f85074d.js";import{K as X,E as L,L as ee}from"./index-2bf0df65.js";import"./index-9b720377.js";var ne=X();const M=L(ne);var te=ee();const z=L(te);function r(i,e){e===void 0&&(e={});var n=e.insertAt;if(i&&typeof document<"u"){var t=document.head||document.getElementsByTagName("head")[0],a=document.createElement("style");a.type="text/css",n==="top"&&t.firstChild?t.insertBefore(a,t.firstChild):t.appendChild(a),a.styleSheet?a.styleSheet.cssText=i:a.appendChild(document.createTextNode(i))}}var E=`.pera-wallet-modal-header {
  position: absolute;
  top: -44px;
  right: 0px;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pera-wallet-modal-header--mobile {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: static;
}
.pera-wallet-modal-header--mobile .pera-wallet-modal-header__close-button {
  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  background: transparent;
  border: unset;
  box-shadow: unset;
}

.pera-wallet-modal-header__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  line-height: 24px;
  letter-spacing: -0.1px;
  color: #ffffff;
}

.pera-wallet-modal-header__brand-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pera-wallet-modal-header__version-number {
  color: #9d9dae;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  letter-spacing: 0.01;
}

.pera-wallet-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 48px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  font-family: var(--pera-wallet-modal-font-family);
  font-size: 14px;
}

.pera-wallet-modal-header__close-button {
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  background: rgba(44, 53, 89, 0.1);
  border-radius: 8px;
}

.pera-wallet-modal-header__close-button__close-icon {
  width: 20px;
  height: 20px;
}`;r(E);const Z=document.createElement("template"),ae=c()?"pera-wallet-modal-header pera-wallet-modal-header--mobile":"pera-wallet-modal-header pera-wallet-modal-header--desktop";Z.innerHTML=`
  <div class="${ae}">
      ${c()?"":`<div class="pera-wallet-modal-header__brand">
              <img src="data:image/svg+xml,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='24' height='24' rx='4.8' fill='%23FFEE55'/%3e%3cpath d='M13.0408 5.92462C13.413 7.46693 13.2872 8.8236 12.7597 8.95482C12.2322 9.08605 11.5028 7.94214 11.1306 6.39983C10.7583 4.85752 10.8842 3.50085 11.4117 3.36963C11.9391 3.2384 12.6685 4.38231 13.0408 5.92462Z' fill='black'/%3e%3cpath d='M19.1876 7.25063C18.3632 6.37689 16.7231 6.61371 15.5243 7.77959C14.3254 8.94547 14.0219 10.5989 14.8463 11.4727C15.6707 12.3464 17.3108 12.1096 18.5097 10.9437C19.7085 9.77781 20.012 8.12438 19.1876 7.25063Z' fill='black'/%3e%3cpath d='M12.6308 20.6297C13.1583 20.4985 13.2656 19.0651 12.8705 17.4281C12.4754 15.7911 11.7275 14.5705 11.2 14.7017C10.6725 14.8329 10.5652 16.2663 10.9603 17.9033C11.3554 19.5403 12.1033 20.7609 12.6308 20.6297Z' fill='black'/%3e%3cpath d='M7.25371 8.05056C8.77551 8.49933 9.8875 9.28664 9.73741 9.80906C9.58731 10.3315 8.23197 10.3912 6.71016 9.94242C5.18836 9.49364 4.07637 8.70633 4.22646 8.18391C4.37656 7.66149 5.7319 7.60178 7.25371 8.05056Z' fill='black'/%3e%3cpath d='M17.1309 13.9497C18.7461 14.4261 19.9338 15.2357 19.7837 15.7581C19.6336 16.2806 18.2025 16.3179 16.5873 15.8416C14.9721 15.3653 13.7844 14.5556 13.9345 14.0332C14.0846 13.5108 15.5157 13.4734 17.1309 13.9497Z' fill='black'/%3e%3cpath d='M8.96609 12.8536C8.5887 12.4624 7.35088 13.0318 6.20133 14.1253C5.05177 15.2188 4.42581 16.4225 4.80319 16.8137C5.18058 17.2048 6.4184 16.6355 7.56796 15.542C8.71751 14.4484 9.34347 13.2448 8.96609 12.8536Z' fill='black'/%3e%3c/svg%3e" />

              <div class="pera-wallet-modal-header__brand-text">
                <span>Pera Connect</span>

                <span class="pera-wallet-modal-header__version-number">v1.5.1</span>
              </div>
            </div>
            `} 

      <button
        id="pera-wallet-modal-header-close-button"
        class="pera-wallet-button pera-wallet-modal-header__close-button">
        <img
          class="pera-wallet-modal-header__close-button__close-icon"
          src="${c()?"data:image/svg+xml,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M18 6L12 12M12 12L6 18M12 12L18 18M12 12L6 6' stroke='%232C3559' stroke-width='2'/%3e%3c/svg%3e":"data:image/svg+xml,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M18 6L12 12M12 12L6 18M12 12L18 18M12 12L6 6' stroke='white' stroke-width='2'/%3e%3c/svg%3e"}"
        />
      </button>
    </div>
`;class oe extends HTMLElement{constructor(){if(super(),this.attachShadow({mode:"open"}),this.shadowRoot){const e=document.createElement("style");e.textContent=E,this.shadowRoot.append(Z.content.cloneNode(!0),e),this.onClose()}}onClose(){var e;const n=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-modal-header-close-button"),t=this.getAttribute("modal-id");n&&t===x&&n.addEventListener("click",()=>{f(x)})}}var H="data:image/svg+xml,%3csvg fill='none' height='80' width='80' xmlns='http://www.w3.org/2000/svg'%3e%3cpath clip-rule='evenodd' d='M39.9 80V68.99h-9.8V80h-.2V68.99h-3.5a6.503 6.503 0 0 1-6.247-4.7 6.514 6.514 0 0 1-4.445-4.444 6.503 6.503 0 0 1-4.695-6.246v-3.5H0v-.2h11.013v-9.8H0v-.2h11.013v-9.8H0v-.2h11.013v-3.5a6.503 6.503 0 0 1 4.694-6.246 6.513 6.513 0 0 1 4.447-4.447 6.503 6.503 0 0 1 6.246-4.696h3.5V0h.2v11.011h9.8V0h.2v11.011h9.8V0h.2v11.011h3.5a6.503 6.503 0 0 1 6.247 4.697 6.514 6.514 0 0 1 4.443 4.444 6.503 6.503 0 0 1 4.701 6.248v3.5H80v.2H68.991v9.8H80v.2H68.991v9.8H80v.2H68.991v3.5a6.503 6.503 0 0 1-4.701 6.248 6.514 6.514 0 0 1-4.443 4.442 6.503 6.503 0 0 1-6.247 4.7h-3.5V80h-.2V68.99h-9.8V80zm28.89-40.1a28.728 28.728 0 0 0-1.746-9.8h-2.5v9.8h4.247zm-4.246.2h4.247a28.729 28.729 0 0 1-1.747 9.8h-2.5zm-.2-.2v-9.8H60.1v9.8zm-4.244.2h4.244v9.8H60.1zm-.2-.2a19.807 19.807 0 0 0-2.633-9.8H50.1v9.8zm-9.8.2h9.8a19.807 19.807 0 0 1-2.633 9.8H50.1zm-.2-.2v-9.8h-9.8v9.8zm-9.8.2h9.8v9.8h-9.8zm-.2-.2v-9.8h-9.8v9.8zm-9.8.2h9.8v9.8h-9.8zm-.2-.2v-9.8h-7.167a19.807 19.807 0 0 0-2.633 9.8zm-9.8.2h9.8v9.8h-7.167a19.807 19.807 0 0 1-2.633-9.8zm-.2-.2v-9.8h-4.245v9.8zm-4.245.2H19.9v9.8h-4.245zm-.2-.2v-9.8H12.96a28.726 28.726 0 0 0-1.748 9.8h4.242zm-4.242.2h4.242v9.8H12.96a28.726 28.726 0 0 1-1.748-9.8zm0 13.5v-3.5h1.608a28.876 28.876 0 0 0 2.634 5.327v2.617c0 .543.066 1.07.192 1.575a6.303 6.303 0 0 1-4.434-6.019zm4.242 1.449a28.674 28.674 0 0 1-2.42-4.949h2.42zm.2.32V50.1H19.9v9.8h-.702a28.915 28.915 0 0 1-3.543-4.53zM20.1 59.9v-9.8h2.518a20.2 20.2 0 0 0 7.282 7.282V59.9zm0-10h2.403a19.966 19.966 0 0 1-2.403-7.053zm9.8 7.25a20 20 0 0 1-7.05-7.05h7.05zm.2.117V50.1h9.8v9.8a19.807 19.807 0 0 1-9.8-2.633zm10 2.633v-9.8h9.8v7.167a19.807 19.807 0 0 1-9.8 2.633zm10-2.75V50.1h7.05a20 20 0 0 1-7.05 7.05zm0 .232a20.2 20.2 0 0 0 7.282-7.282H59.9v9.8h-9.8zm7.397-7.482H59.9v-7.053a19.966 19.966 0 0 1-2.403 7.053zm2.603 10v-9.8h4.244v5.28a28.91 28.91 0 0 1-3.538 4.52zm4.444-4.841V50.1h2.426a28.67 28.67 0 0 1-2.426 4.959zm0 .378a28.881 28.881 0 0 0 2.64-5.337h1.607v3.5a6.303 6.303 0 0 1-4.44 6.021 6.514 6.514 0 0 0 .193-1.577zm2.713-5.537h1.534v-6.477a28.817 28.817 0 0 1-1.534 6.477zm-56.044 0h1.535a28.807 28.807 0 0 1-1.535-6.477zm57.578-20v-3.5a6.303 6.303 0 0 0-4.44-6.02c.126.504.193 1.031.193 1.575v2.608a28.877 28.877 0 0 1 2.639 5.337zm-1.534.2h1.534v6.477a28.815 28.815 0 0 0-1.534-6.477zm-.288-.2a28.673 28.673 0 0 0-2.425-4.958V29.9zm-2.625 0v-5.279a28.911 28.911 0 0 0-3.538-4.521H60.1v9.8zm-4.444 0v-9.8h-9.8v2.518a20.2 20.2 0 0 1 7.282 7.282zm-2.403.2H59.9v7.053a19.966 19.966 0 0 0-2.403-7.053zm-.347-.2a20 20 0 0 0-7.05-7.05v7.05zm-7.25 0v-7.167a19.807 19.807 0 0 0-9.8-2.633v9.8zm-10 0v-9.8a19.807 19.807 0 0 0-9.8 2.633V29.9zm-10 0v-7.05a20 20 0 0 0-7.05 7.05zm-7.282 0a20.2 20.2 0 0 1 7.282-7.282V20.1h-9.8v9.8zm-2.518.2h2.403a19.966 19.966 0 0 0-2.403 7.053zm-.2-.2v-9.8h-.701a28.915 28.915 0 0 0-3.544 4.53v5.27zm-4.445 0v-4.948a28.665 28.665 0 0 0-2.42 4.948zm-2.634 0a28.874 28.874 0 0 1 2.634-5.327v-2.618c0-.543.066-1.07.191-1.574a6.303 6.303 0 0 0-4.433 6.019v3.5zm-1.608.2h1.535a28.81 28.81 0 0 0-1.535 6.477zM36.58 68.79H30.1v-1.536c2.06.749 4.23 1.27 6.479 1.535zm3.321-.001a28.726 28.726 0 0 1-9.8-1.748v-2.497h9.8zm-10-1.822v-2.423h-4.953a28.678 28.678 0 0 0 4.953 2.423zm10-2.623h-9.8V60.1h9.8zm-10 0V60.1h-9.8v.702a28.915 28.915 0 0 0 4.526 3.542H29.9zm7.254-4.444H30.1v-2.403a19.966 19.966 0 0 0 7.053 2.403zm0-39.8a19.966 19.966 0 0 0-7.054 2.403V20.1h7.053zm2.746-.2h-9.8v-4.245h9.8zm-10 0v-4.245h-5.27a28.907 28.907 0 0 0-4.53 3.544v.701zm10-4.445h-9.8V12.96a28.729 28.729 0 0 1 9.8-1.749zm-10 0v-2.421a28.668 28.668 0 0 0-4.95 2.42h4.95zm6.679-4.244a28.81 28.81 0 0 0-6.479 1.536V11.21h6.479zm-6.679 1.61v-1.61h-3.5a6.303 6.303 0 0 0-6.02 4.436 6.514 6.514 0 0 1 1.575-.192h2.617A28.877 28.877 0 0 1 29.9 12.82zm0 55.968V67.18a28.878 28.878 0 0 1-5.331-2.636h-2.614c-.543 0-1.07-.067-1.575-.192a6.303 6.303 0 0 0 6.02 4.437zm20.2 0h3.5a6.303 6.303 0 0 0 6.02-4.438 6.513 6.513 0 0 1-1.576.193h-2.608a28.879 28.879 0 0 1-5.336 2.638zm-.2-1.534v1.534h-6.475a28.808 28.808 0 0 0 6.475-1.534zm.2-.287a28.671 28.671 0 0 0 4.957-2.424H50.1v2.424zm-.2-2.424v2.499a28.728 28.728 0 0 1-9.8 1.746v-4.245zm.2-.2h5.278a28.914 28.914 0 0 0 4.522-3.538V60.1h-9.8zm-.2-4.244v4.244h-9.8V60.1zm0-2.603V59.9h-7.053a19.966 19.966 0 0 0 7.053-2.403zm0-37.397v2.403a19.966 19.966 0 0 0-7.053-2.403H49.9zm.2-.2h9.8v-.705a28.911 28.911 0 0 0-4.526-3.54H50.1V19.9zm-.2-4.245V19.9h-9.8v-4.245h9.8zm.2-.2h4.954a28.676 28.676 0 0 0-4.954-2.423zm-.2-2.497v2.497h-9.8V11.21a28.75 28.75 0 0 1 9.8 1.747zm.2-.14a28.877 28.877 0 0 1 5.332 2.637h2.612c.543 0 1.071.066 1.576.192a6.303 6.303 0 0 0-6.02-4.436h-3.5zm-.2-1.607v1.534a28.812 28.812 0 0 0-6.475-1.534H49.9zm-34.245 44.53v2.303c0 .567.075 1.117.215 1.64a6.309 6.309 0 0 0 1.643.216h1.41a29.118 29.118 0 0 1-3.268-4.16zm3.458 4.359h-1.6a6.513 6.513 0 0 1-1.578-.193 6.315 6.315 0 0 0 4.157 4.157 6.517 6.517 0 0 1-.192-1.575v-1.602a29.35 29.35 0 0 1-.787-.787zm.787.509a29.029 29.029 0 0 1-.508-.509h.508zm.2.469v1.411c0 .567.075 1.117.215 1.64.523.14 1.073.215 1.64.215h2.3a29.118 29.118 0 0 1-4.155-3.266zm35.649 3.266h2.295c.567 0 1.117-.075 1.64-.216a6.286 6.286 0 0 0 .216-1.639v-1.407a29.116 29.116 0 0 1-4.151 3.262zm4.35-3.454v1.598a6.53 6.53 0 0 1-.192 1.574 6.314 6.314 0 0 0 4.155-4.154 6.509 6.509 0 0 1-1.572.191h-1.6a29.08 29.08 0 0 1-.791.791zm.982-.991h1.41c.565 0 1.114-.075 1.636-.215a6.31 6.31 0 0 0 .216-1.641V55.75a29.113 29.113 0 0 1-3.262 4.15zm3.262-35.65v-2.295c0-.568-.075-1.117-.216-1.64a6.307 6.307 0 0 0-1.637-.215h-1.41a29.112 29.112 0 0 1 3.263 4.15zM60.89 19.9h1.6c.542 0 1.069.066 1.573.192a6.314 6.314 0 0 0-4.156-4.157 6.51 6.51 0 0 1 .192 1.576v1.598c.269.259.532.522.79.791zm-.991-.981V17.51a6.31 6.31 0 0 0-.216-1.64 6.308 6.308 0 0 0-1.64-.216h-2.299a29.108 29.108 0 0 1 4.155 3.264zm-35.641-3.264h-2.304a6.31 6.31 0 0 0-1.639.215 6.306 6.306 0 0 0-.216 1.641v1.412a29.115 29.115 0 0 1 4.159-3.268zM19.9 19.113v-1.602c0-.543.067-1.072.193-1.577a6.315 6.315 0 0 0-4.159 4.16 6.518 6.518 0 0 1 1.58-.194h1.6c.257-.267.519-.53.786-.787zm-.508.787h.508v-.508c-.171.167-.34.337-.508.508zm-.47.2h-1.409a6.31 6.31 0 0 0-1.643.216 6.308 6.308 0 0 0-.215 1.639v2.305a29.107 29.107 0 0 1 3.268-4.16zm41.178-.712c.173.168.344.34.512.512H60.1zm.513 40.712c-.169.173-.34.344-.513.513V60.1z' fill='%2394a3b8' fill-rule='evenodd'/%3e%3crect fill='black' height='80' rx='16' width='80'/%3e%3cpath d='M43.47 19.752c1.24 5.14.821 9.663-.937 10.1-1.758.438-4.19-3.375-5.43-8.517-1.241-5.14-.822-9.663.936-10.1 1.759-.438 4.19 3.376 5.43 8.517zm20.49 4.42c-2.749-2.913-8.216-2.123-12.212 1.763s-5.008 9.398-2.26 12.31 8.215 2.123 12.211-1.763 5.008-9.398 2.26-12.31zM42.102 68.769c1.758-.438 2.116-5.216.8-10.673-1.318-5.456-3.81-9.525-5.57-9.088-1.757.438-2.115 5.216-.798 10.672 1.317 5.457 3.81 9.526 5.568 9.089zM24.18 26.838c5.073 1.496 8.78 4.12 8.28 5.862-.5 1.741-5.019 1.94-10.091.444-5.073-1.496-8.78-4.12-8.28-5.861.501-1.742 5.019-1.941 10.092-.445zm32.924 19.664c5.384 1.588 9.343 4.286 8.843 6.028-.5 1.741-5.27 1.866-10.654.278-5.385-1.588-9.343-4.286-8.843-6.028.5-1.741 5.27-1.866 10.654-.278zm-27.216-3.654c-1.258-1.304-5.384.594-9.215 4.24-3.832 3.644-5.919 7.656-4.66 8.96 1.257 1.304 5.383-.594 9.215-4.239s5.918-7.657 4.66-8.96z' fill='%23fe5'/%3e%3c/svg%3e",B=`.pera-wallet-download-qr-code-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin: 26px auto 0;
  padding: 10px;
  box-shadow: 0px 20px 60px rgba(26, 35, 91, 0.15), 0px 4px 12px rgba(26, 35, 91, 0.05), 0px 1px 4px rgba(26, 35, 91, 0.06);
  border-radius: 24px;
}

@media (max-width: 767px) {
  .pera-wallet-download-qr-code-wrapper {
    margin-top: 51px;
  }
}`;r(B);const F=document.createElement("template");F.innerHTML=`
  <div id="pera-wallet-download-qr-code-wrapper" class="pera-wallet-download-qr-code-wrapper"></div>  
`;class le extends HTMLElement{constructor(){if(super(),this.attachShadow({mode:"open"}),this.shadowRoot){const e=document.createElement("style");e.textContent=B,this.shadowRoot.append(F.content.cloneNode(!0),e)}}connectedCallback(){var e;const n=new M({width:205,height:205,type:"svg",data:Q,image:H,dotsOptions:{color:"#000",type:"extra-rounded"},imageOptions:{crossOrigin:"anonymous",margin:10},cornersSquareOptions:{type:"extra-rounded"},cornersDotOptions:{type:"dot"}}),t=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-download-qr-code-wrapper");t&&n.append(t)}}var k="data:image/svg+xml,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M8.5 19L15.5 12L8.5 5' stroke='%233C3C49' stroke-width='2'/%3e%3c/svg%3e",A=`.pera-wallet-connect-modal-desktop-mode {
  display: grid;
  grid-template-columns: 205px auto;
  gap: 70px;
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__default-view {
  display: block;
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-item--active .pera-wallet-accordion-item__content {
  height: 364px;
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable .pera-wallet-accordion-item--web-wallet {
  display: none;
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable .pera-wallet-accordion-item .pera-wallet-accordion-toggle {
  padding: 26px 24px 12px;
  border-radius: 24px 24px 0 0;
  transition: all ease-in 0.2s;
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable .pera-wallet-accordion-item .pera-wallet-accordion-item__content {
  height: 434px;
  border-radius: 0 0 24px 24px;
  transition: height ease-in 0.2s;
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable .pera-wallet-accordion-item .pera-wallet-accordion-icon {
  transform: rotate(90deg);
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable .pera-wallet-connect-modal-desktop-mode__download-pera-description {
  margin-top: 50px;
}
.pera-wallet-connect-modal-desktop-mode--default .pera-wallet-connect-modal-desktop-mode__download-view {
  display: none;
}
.pera-wallet-connect-modal-desktop-mode--download .pera-wallet-connect-modal-desktop-mode__default-view {
  display: none;
}
.pera-wallet-connect-modal-desktop-mode--download .pera-wallet-connect-modal-desktop-mode__download-view {
  display: block;
}
.pera-wallet-connect-modal-desktop-mode--download .pera-wallet-connect-modal-desktop-mode__download-view .pera-wallet-connect-modal-download-pera-view__footer a {
  display: flex;
  cursor: pointer;
}
.pera-wallet-connect-modal-desktop-mode--compact {
  grid-template-columns: unset;
  gap: unset;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__web-wallet {
  padding: 28px 40px;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__web-wallet .pera-wallet-connect-modal-desktop-mode__web-wallet__logo-wrapper {
  box-shadow: unset;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__web-wallet .pera-wallet-connect-modal-desktop-mode__web-wallet__description {
  margin-bottom: 16px;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__web-wallet .pera-wallet-connect-modal-desktop-mode__web-wallet__launch-button {
  width: 172px;
  height: 40px;
  margin: 0 auto;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__web-wallet-iframe {
  height: 100%;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view {
  overflow: hidden;
  border-radius: 24px;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-item {
  margin-bottom: 0;
  border-radius: 0;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-item:not(:last-child) {
  border-bottom: 1px solid #e6e8ee;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-item #pera-wallet-iframe {
  height: 100%;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-toggle {
  padding: 20px;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-toggle__text, .pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-toggle__content-with-label__text {
  color: #626268;
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.09px;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-toggle__bold-color {
  font-weight: 600;
  color: #1a1a1a;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-accordion-item--active .pera-wallet-accordion-item__content {
  height: 265px;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-connect-modal-desktop-mode__download-pera-container {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding: 0 20px;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-connect-modal-desktop-mode__download-pera-description,
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-connect-modal-desktop-mode__download-pera-button {
  margin: 0;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-connect-modal-desktop-mode__download-pera-button {
  font-weight: 500;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-connect-qr-code-wrapper {
  margin: 4px auto 0;
  padding: 0;
  box-shadow: unset;
}
.pera-wallet-connect-modal-desktop-mode--compact .pera-wallet-connect-modal-desktop-mode__default-view .pera-wallet-connect-qr-code-wrapper svg {
  padding: 8px;
  box-shadow: 0px 20px 60px rgba(26, 35, 91, 0.15), 0px 4px 12px rgba(26, 35, 91, 0.05), 0px 1px 4px rgba(26, 35, 91, 0.06);
  border-radius: 12px;
}
.pera-wallet-connect-modal-desktop-mode--select-account {
  width: 100%;
  height: 100%;
}
.pera-wallet-connect-modal-desktop-mode--select-account.pera-wallet-connect-modal-desktop-mode--default {
  overflow: hidden;
}
.pera-wallet-connect-modal-desktop-mode--select-account .pera-wallet-connect-modal-desktop-mode__web-wallet-iframe {
  position: unset;
}
.pera-wallet-connect-modal-desktop-mode--select-account .pera-wallet-accordion {
  overflow: hidden;
}
.pera-wallet-connect-modal-desktop-mode--select-account #pera-wallet-iframe {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  border-radius: 16px;
}

.pera-wallet-connect-modal-desktop-mode__accordion__description,
.pera-wallet-connect-modal-desktop-mode__connect-button-wrapper {
  padding: 0 40px 20px 64px;
}

.pera-wallet-connect-modal-desktop-mode__web-wallet {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 88px);
  padding: 48px 52px 40px;
  margin: 0 auto;
}

.pera-wallet-connect-modal-desktop-mode__web-wallet__logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0px 0px 1px rgba(12, 26, 75, 0.1), 0px 10px 16px rgba(20, 37, 63, 0.06);
}

.pera-wallet-connect-modal-desktop-mode__web-wallet__description {
  margin: 0 auto 32px;
  font-size: 14px;
  line-height: 24px;
  letter-spacing: -0.1px;
  text-align: center;
  color: #6a6a81;
}

.pera-wallet-connect-modal-desktop-mode__web-wallet__launch-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 0;
  color: #ffffff;
  background-color: #6b46fe;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.1;
  border: none;
  outline: none;
  cursor: pointer;
}

.pera-wallet-connect-modal-desktop-mode__web-wallet-iframe {
  position: relative;
  width: fit-content;
  margin: 0 auto;
}

.pera-wallet-connect-modal-desktop-mode__connect-button {
  display: block;
  width: 100%;
  height: 48px;
  border: unset;
  border-radius: 6px;
  background-color: #333333;
  color: white;
  cursor: pointer;
  font-family: var(--pera-wallet-modal-font-family);
  font-size: 13px;
}

.pera-wallet-connect-qr-code-wrapper {
  width: fit-content;
  margin: 24px auto 0;
  padding: 10px;
  box-shadow: 0px 20px 60px rgba(26, 35, 91, 0.15), 0px 4px 12px rgba(26, 35, 91, 0.05), 0px 1px 4px rgba(26, 35, 91, 0.06);
  border-radius: 24px;
}

.pera-wallet-connect-modal-desktop-mode__download-pera-description {
  color: #838aa6;
  text-align: center;
  margin: 32px 0 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.04px;
}

.pera-wallet-connect-modal-desktop-mode__download-pera-button {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  padding: 0;
  color: #6b46fe;
  background-color: transparent;
  outline: none;
  border: none;
  font-weight: 600;
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 0.01px;
  cursor: pointer;
}

.pera-wallet-connect-modal-download-pera-view__back-button {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  padding: 12px 24px;
  color: #3c3c49;
  background-color: #ffffff;
  outline: none;
  box-shadow: 0px 0px 1px rgba(12, 26, 75, 0.24), 0px 3px 8px -1px rgba(50, 50, 71, 0.05);
  border: unset;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  line-height: 24px;
  letter-spacing: -0.1px;
  cursor: pointer;
}

.pera-wallet-connect-modal-download-pera-view {
  padding: 32px 37px 28px;
  background-color: #ffffff;
  box-shadow: 0px 0px 1px rgba(12, 26, 75, 0.24), 0px 3px 8px -1px rgba(50, 50, 71, 0.05);
  border-radius: 24px;
}

.pera-wallet-connect-modal-download-pera-view__title {
  margin-bottom: 8px;
  color: #3c3c49;
  font-weight: 600;
  font-size: 15px;
  line-height: 18px;
  text-align: center;
  letter-spacing: -0.13px;
}

.pera-wallet-connect-modal-download-pera-view__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 53px;
}

.pera-wallet-connect-modal-download-pera-view__footer__button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  color: #6a6a81;
  background-color: #ffffff;
  box-shadow: 0px 0px 1px rgba(12, 26, 75, 0.24), 0px 3px 8px -1px rgba(50, 50, 71, 0.05);
  text-decoration: none;
  border-radius: 12px;
  font-weight: 500;
  font-size: 13px;
  line-height: 200%;
  letter-spacing: -0.04px;
  cursor: pointer;
}

#pera-wallet-iframe {
  width: 285px;
  height: 376px;
  margin: 0 auto;
  border: none;
}

@media (max-width: 767px) {
  .pera-wallet-connect-modal-desktop-mode {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .pera-wallet-connect-qr-code-wrapper {
    margin-top: 16px;
  }
  .pera-wallet-connect-modal-download-pera-view {
    padding: 24px;
  }
  .pera-wallet-download-qr-code-wrapper {
    margin-top: 32px;
  }
  .pera-wallet-connect-modal-download-pera-view__footer {
    margin-top: 40px;
  }
}`;r(A);var V=`.pera-wallet-accordion-item {
  background-color: #ffffff;
  border-radius: 24px;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.02), 0px 4px 12px rgba(0, 0, 0, 0.03);
}
.pera-wallet-accordion-item:not(:last-of-type) {
  margin-bottom: 20px;
}
.pera-wallet-accordion-item:not(:last-of-type) .pera-wallet-accordion-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}
.pera-wallet-accordion-item .pera-wallet-accordion-item__content {
  height: 0;
  overflow: hidden;
  color: #69708d;
  background-color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.04px;
  transition: height ease-in 0.2s;
}
.pera-wallet-accordion-item--active .pera-wallet-accordion-toggle {
  padding: 26px 24px 12px;
  border-radius: 24px 24px 0 0;
  transition: all ease-in 0.2s;
}
.pera-wallet-accordion-item--active .pera-wallet-accordion-item__content {
  border-radius: 0 0 24px 24px;
  transition: height ease-in 0.2s;
}
.pera-wallet-accordion-item--active .pera-wallet-accordion-icon {
  transform: rotate(90deg);
}

.pera-wallet-accordion-toggle {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  color: #2c3559;
  background-color: #ffffff;
  border: none;
  border-radius: 24px;
  outline: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 18px;
  letter-spacing: -0.1px;
  font-weight: 600;
  transition: all ease-in 0.2s;
}
.pera-wallet-accordion-toggle__text, .pera-wallet-accordion-toggle__content-with-label__text {
  color: #626268;
}

.pera-wallet-accordion-icon {
  transition: all ease-in 0.2s;
}

.pera-wallet-accordion-toggle__bold-color {
  color: #1A1A1A;
  font-weight: 600;
}

.pera-wallet-accordion-toggle__content-with-label {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pera-wallet-accordion-toggle__label {
  padding: 4px 9px;
  color: #1C786C;
  background: #E0FAEE;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  letter-spacing: 0.01px;
}

.pera-wallet-accordion-toggle__button {
  position: absolute;
  z-index: 2;
  width: 100%;
  height: 100%;
  background: transparent;
  box-shadow: none;
  outline: none;
  border: none;
  cursor: pointer;
}

@media (max-width: 767px) {
  .pera-wallet-accordion-toggle {
    font-size: 14px;
    font-weight: 500;
    line-height: 24px;
    letter-spacing: -0.1px;
  }
}`;r(V);const R=document.createElement("template"),S=document.createElement("style"),I=document.createElement("style");S.textContent=A,I.textContent=V;R.innerHTML=`
  <div id="pera-wallet-connect-modal-desktop-mode" class="pera-wallet-connect-modal-desktop-mode pera-wallet-connect-modal-desktop-mode--default">
      <pera-wallet-connect-modal-information-section></pera-wallet-connect-modal-information-section>

      <div class="pera-wallet-connect-modal-desktop-mode__default-view"></div>
       

      <div class="pera-wallet-connect-modal-desktop-mode__download-view">
        <button
          id="pera-wallet-connect-modal-download-pera-view-back-button"
          class="pera-wallet-connect-modal-download-pera-view__back-button">
          <img
            src="data:image/svg+xml,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.7071 6.29387C11.0976 6.68439 11.0976 7.31756 10.7071 7.70808L7.41421 11.001L19 11.001C19.5523 11.001 20 11.4487 20 12.001C20 12.5533 19.5523 13.001 19 13.001L7.41421 13.001L10.7071 16.2939C11.0976 16.6844 11.0976 17.3176 10.7071 17.7081C10.3166 18.0986 9.68342 18.0986 9.29289 17.7081L4.29289 12.7081C4.10536 12.5205 4 12.2662 4 12.001C4 11.7358 4.10536 11.4814 4.29289 11.2939L9.29289 6.29387C9.68342 5.90335 10.3166 5.90335 10.7071 6.29387Z' fill='%233C3C49'/%3e%3c/svg%3e"
            alt="Back Arrow"
          />

          Back
        </button>

        <div class="pera-wallet-connect-modal-download-pera-view">
          <h1 class="pera-wallet-connect-modal-download-pera-view__title">
            Download Pera Wallet
          </h1>

          <pera-wallet-download-qr-code></pera-wallet-download-qr-code>

          <div class="pera-wallet-connect-modal-download-pera-view__footer">
            <a
              href="https://apps.apple.com/us/app/algorand-wallet/id1459898525"
              target="_blank"
              rel="noopener noreferrer">
              <img src="data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='40' height='40' rx='12' fill='black'/%3e%3cpath d='M25.6308 20.3011C25.6416 19.4664 25.8633 18.6481 26.2753 17.9221C26.6873 17.1962 27.2763 16.5863 27.9873 16.1491C27.5356 15.5039 26.9397 14.973 26.2469 14.5984C25.554 14.2239 24.7834 14.016 23.9963 13.9914C22.317 13.8151 20.6891 14.9962 19.8333 14.9962C18.9611 14.9962 17.6436 14.0089 16.2249 14.0381C15.3072 14.0677 14.4128 14.3346 13.6289 14.8126C12.8451 15.2906 12.1984 15.9636 11.7519 16.7659C9.81789 20.1144 11.2605 25.0354 13.1132 27.742C14.0401 29.0674 15.1233 30.5478 16.5408 30.4953C17.9278 30.4378 18.4458 29.6108 20.1202 29.6108C21.779 29.6108 22.265 30.4953 23.7112 30.4619C25.1995 30.4378 26.1372 29.1307 27.0316 27.7928C27.6976 26.8484 28.2101 25.8047 28.55 24.7003C27.6853 24.3345 26.9474 23.7224 26.4283 22.9401C25.9092 22.1578 25.6318 21.2399 25.6308 20.3011ZM22.8993 12.2113C23.7108 11.2371 24.1106 9.98492 24.0138 8.7207C22.7739 8.85092 21.6287 9.44347 20.8062 10.3803C20.404 10.838 20.096 11.3704 19.8998 11.9472C19.7035 12.5239 19.6229 13.1337 19.6625 13.7417C20.2826 13.7481 20.8961 13.6137 21.4568 13.3486C22.0175 13.0835 22.5107 12.6946 22.8993 12.2113Z' fill='white'/%3e%3c/svg%3e" alt="App Store icon" />
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.algorand.android"
              target="_blank"
              rel="noopener noreferrer">
              <img src="data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='40' height='40' rx='12' fill='black'/%3e%3cpath d='M12.41 9.7719C12.1334 10.0219 11.9683 10.4388 11.9683 10.9922V10.8671V29.1294V29.0091C11.9683 29.5202 12.1099 29.9149 12.3497 30.169L12.4109 30.2277V30.228C12.6051 30.4035 12.854 30.4966 13.1393 30.4963C13.418 30.4963 13.7316 30.4073 14.0626 30.2194L26.0264 23.4107L30.1359 21.0717C30.6578 20.7748 30.9508 20.3917 30.9998 20.0014V19.9998C30.9508 19.6087 30.6578 19.2259 30.1359 18.9289L26.0261 16.5902L14.0627 9.78154C13.731 9.59325 13.4171 9.50391 13.1376 9.50391C12.8527 9.50391 12.6041 9.59677 12.41 9.7719H12.41Z' fill='%2300C1FF'/%3e%3cpath d='M12.411 30.2285L12.3497 30.1698C12.1099 29.9157 11.9683 29.5209 11.9683 29.0098V29.1301V10.8724V10.993C11.9683 10.4396 12.1334 10.0226 12.41 9.77268L22.622 20.0009L12.411 30.2285Z' fill='url(%23paint0_linear_173_14441)'/%3e%3cpath d='M26.0256 23.4102L22.6211 19.9996L26.0253 16.5896L30.1351 18.9283C30.657 19.2253 30.95 19.6081 30.9989 19.9993V20.0008C30.95 20.3911 30.657 20.7742 30.1351 21.0712L26.0256 23.4101' fill='url(%23paint1_linear_173_14441)'/%3e%3cpath d='M13.1374 30.4961C12.8522 30.4964 12.6033 30.4032 12.4092 30.2277V30.2275L22.6202 19.9999L26.0246 23.4104L14.0608 30.2191C13.7298 30.4071 13.4162 30.4961 13.1374 30.4961Z' fill='url(%23paint2_linear_173_14441)'/%3e%3cpath d='M22.6212 20.002L12.4092 9.7737C12.6033 9.59858 12.8519 9.50571 13.1368 9.50571C13.4163 9.50571 13.7302 9.59501 14.0618 9.78335L26.0253 16.592L22.6212 20.002' fill='url(%23paint3_linear_173_14441)'/%3e%3cpath d='M13.1394 30.6172C12.8542 30.6172 12.6049 30.524 12.4108 30.3486L12.4105 30.3489C12.4097 30.3481 12.4088 30.3473 12.4079 30.3466L12.3548 30.2947C12.3531 30.2931 12.3516 30.2912 12.3496 30.2893L12.4108 30.2279C12.6049 30.4034 12.8538 30.4966 13.1392 30.4962C13.4179 30.4962 13.7315 30.4073 14.0625 30.2193L26.0263 23.4106L26.1029 23.4874L26.0253 23.5316L14.0625 30.3398C13.7608 30.5111 13.4739 30.6004 13.2147 30.6153C13.1896 30.6165 13.1645 30.6171 13.1394 30.6172' fill='url(%23paint4_linear_173_14441)'/%3e%3cpath d='M12.3497 30.2891C12.1099 30.0349 11.9683 29.6406 11.9683 29.1292V29.0089C11.9683 29.52 12.1099 29.9146 12.3497 30.1688L12.4109 30.2275L12.3497 30.2891Z' fill='url(%23paint5_linear_173_14441)'/%3e%3cpath d='M26.1025 23.4882L26.0259 23.4114L30.1349 21.0727C30.6568 20.7758 30.9498 20.3927 30.9987 20.0025C30.9987 20.1457 30.9668 20.2889 30.9035 20.4282C30.7756 20.7091 30.5194 20.9744 30.135 21.1934L26.1025 23.4883' fill='url(%23paint6_linear_173_14441)'/%3e%3cpath d='M30.9991 20C30.9501 19.6089 30.6571 19.2261 30.1353 18.9291L26.0259 16.5907L26.1025 16.5139H26.1029L30.1353 18.8088C30.7106 19.1365 30.9987 19.5682 30.9991 20Z' fill='url(%23paint7_linear_173_14441)'/%3e%3cpath d='M11.9683 10.9922V10.8661C11.9683 10.8206 11.9695 10.7761 11.9718 10.7329V10.7309C11.9718 10.7303 11.9718 10.7297 11.972 10.729V10.7242C11.9969 10.284 12.1334 9.94066 12.3497 9.71139L12.4099 9.77198C12.1334 10.0219 11.9683 10.4388 11.9683 10.9922Z' fill='url(%23paint8_linear_173_14441)'/%3e%3cpath d='M26.026 16.5898L14.0625 9.78115C13.7308 9.59285 13.417 9.50355 13.1375 9.50355C12.8525 9.50355 12.6039 9.59642 12.4099 9.77154L12.3496 9.71091C12.3684 9.69096 12.388 9.67172 12.4082 9.65322C12.4089 9.65255 12.4099 9.65188 12.4105 9.65125C12.6031 9.47747 12.849 9.3846 13.1314 9.38293H13.1375C13.417 9.38293 13.7308 9.47227 14.0625 9.66064L26.1029 16.5128L26.1026 16.513L26.026 16.5898Z' fill='url(%23paint9_linear_173_14441)'/%3e%3cdefs%3e%3clinearGradient id='paint0_linear_173_14441' x1='18.4943' y1='10.6794' x2='9.69389' y2='19.494' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%2300A0FF'/%3e%3cstop offset='0.00657' stop-color='%2300A1FF'/%3e%3cstop offset='0.2601' stop-color='%2300BEFF'/%3e%3cstop offset='0.5122' stop-color='%2300D2FF'/%3e%3cstop offset='0.7604' stop-color='%2300DFFF'/%3e%3cstop offset='1' stop-color='%2300E3FF'/%3e%3c/linearGradient%3e%3clinearGradient id='paint1_linear_173_14441' x1='31.6348' y1='19.9407' x2='11.691' y2='19.9407' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFE000'/%3e%3cstop offset='0.4087' stop-color='%23FFBD00'/%3e%3cstop offset='0.7754' stop-color='orange'/%3e%3cstop offset='1' stop-color='%23FF9C00'/%3e%3c/linearGradient%3e%3clinearGradient id='paint2_linear_173_14441' x1='24.2172' y1='23.2425' x2='9.30414' y2='38.0705' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FF3A44'/%3e%3cstop offset='1' stop-color='%23C31162'/%3e%3c/linearGradient%3e%3clinearGradient id='paint3_linear_173_14441' x1='9.77725' y1='8.25731' x2='16.4237' y2='14.876' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%2332A071'/%3e%3cstop offset='0.0685' stop-color='%232DA771'/%3e%3cstop offset='0.4762' stop-color='%2315CF74'/%3e%3cstop offset='0.8009' stop-color='%2306E775'/%3e%3cstop offset='1' stop-color='%2300F076'/%3e%3c/linearGradient%3e%3clinearGradient id='paint4_linear_173_14441' x1='24.2114' y1='25.6084' x2='12.2683' y2='37.5709' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23CC2E36'/%3e%3cstop offset='1' stop-color='%239C0E4E'/%3e%3c/linearGradient%3e%3clinearGradient id='paint5_linear_173_14441' x1='13.3285' y1='10.6804' x2='5.57625' y2='18.4453' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23008DE0'/%3e%3cstop offset='0.00657' stop-color='%23008DE0'/%3e%3cstop offset='0.2601' stop-color='%2300A7E0'/%3e%3cstop offset='0.5122' stop-color='%2300B8E0'/%3e%3cstop offset='0.7604' stop-color='%2300C4E0'/%3e%3cstop offset='1' stop-color='%2300C7E0'/%3e%3c/linearGradient%3e%3clinearGradient id='paint6_linear_173_14441' x1='31.6346' y1='20.0018' x2='11.6929' y2='20.0018' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23E0C500'/%3e%3cstop offset='0.4087' stop-color='%23E0A600'/%3e%3cstop offset='0.7754' stop-color='%23E09100'/%3e%3cstop offset='1' stop-color='%23E08900'/%3e%3c/linearGradient%3e%3clinearGradient id='paint7_linear_173_14441' x1='31.6349' y1='20.0008' x2='11.6933' y2='20.0008' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFE840'/%3e%3cstop offset='0.4087' stop-color='%23FFCE40'/%3e%3cstop offset='0.7754' stop-color='%23FFBC40'/%3e%3cstop offset='1' stop-color='%23FFB540'/%3e%3c/linearGradient%3e%3clinearGradient id='paint8_linear_173_14441' x1='13.3201' y1='10.6927' x2='5.8533' y2='17.8475' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%2340B8FF'/%3e%3cstop offset='0.00657' stop-color='%2340B9FF'/%3e%3cstop offset='0.2601' stop-color='%2340CEFF'/%3e%3cstop offset='0.5122' stop-color='%2340DDFF'/%3e%3cstop offset='0.7604' stop-color='%2340E7FF'/%3e%3cstop offset='1' stop-color='%2340EAFF'/%3e%3c/linearGradient%3e%3clinearGradient id='paint9_linear_173_14441' x1='9.76302' y1='10.4182' x2='15.0961' y2='15.76' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%2365B895'/%3e%3cstop offset='0.0685' stop-color='%2362BD95'/%3e%3cstop offset='0.4762' stop-color='%2350DB97'/%3e%3cstop offset='0.8009' stop-color='%2344ED98'/%3e%3cstop offset='1' stop-color='%2340F498'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e" alt="Play Store icon" />
            </a>

            <a
              class="pera-wallet-connect-modal-download-pera-view__footer__button"
              href="https://perawallet.s3-eu-west-3.amazonaws.com/android-releases/app-pera-prod-release-bitrise-signed.apk"
              target="_blank"
              rel="noopener noreferrer">
              <img src="data:image/svg+xml,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M3 14V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V14' stroke='%232C3559' stroke-width='1.5'/%3e%3cpath d='M11.9998 16V3M11.9998 16L7.47803 11.4783M11.9998 16L16.5215 11.4783' stroke='%232C3559' stroke-width='1.5'/%3e%3c/svg%3e" alt="Download icon" />

              Download APK File
            </a>
          </div>
        </div>
      </div>
    </div>
  `;class ie extends HTMLElement{constructor(){var e;if(super(),this.attachShadow({mode:"open"}),this.shadowRoot){if(this.shadowRoot.append(R.content.cloneNode(!0),S,I),this.shadowRoot.addEventListener("click",l=>{this.handleAccordion(l)}),this.getAttribute("compact-mode")==="true"){const l=this.shadowRoot.getElementById("pera-wallet-connect-modal-desktop-mode");l==null||l.classList.add("pera-wallet-connect-modal-desktop-mode--compact")}const n=(e=this.shadowRoot)===null||e===void 0?void 0:e.querySelector(".pera-wallet-connect-modal-desktop-mode__default-view"),t=this.getAttribute("promote-mobile")==="true",{webWalletOption:a,mobileWalletOption:o}=function(l){const u=`
  <div id="web-wallet-option" class="pera-wallet-accordion-item ${l?"":"pera-wallet-accordion-item--active"}  pera-wallet-accordion-item--web-wallet">
            <a class="pera-wallet-accordion-toggle">
              <button class="pera-wallet-accordion-toggle__button"></button>
  
              <img src="${k}" class="pera-wallet-accordion-icon" />
  
              <div class="pera-wallet-accordion-toggle__content-with-label">
                <div class="pera-wallet-accordion-toggle__content-with-label__text">
                  Connect With
  
                  <span class="pera-wallet-accordion-toggle__bold-color">
                    Pera Web
                  </span>
                </div>
  
                <span id="pera-web-new-label" class="pera-wallet-accordion-toggle__label">NEW</span>
              </div>
            </a>
  
            <div class="pera-wallet-accordion-item__content">
              <div class="pera-wallet-connect-modal-desktop-mode__web-wallet"><div>
              
              <div
                class="pera-wallet-connect-modal-desktop-mode__web-wallet__logo-wrapper">
                <img src="data:image/svg+xml,%3csvg width='44' height='44' viewBox='0 0 44 44' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3crect x='3.5' y='7.5' width='36' height='26' rx='5.5' stroke='%236B46FE' stroke-width='3'/%3e%3cpath d='M22.4973 14.5237C22.8556 16.041 22.7344 17.3757 22.2267 17.5048C21.719 17.6339 21.0169 16.5085 20.6586 14.9912C20.3003 13.4739 20.4214 12.1392 20.9292 12.0101C21.4369 11.881 22.1389 13.0064 22.4973 14.5237Z' fill='%236B46FE'/%3e%3cpath d='M28.4139 15.8282C27.6204 14.9686 26.0417 15.2016 24.8877 16.3486C23.7338 17.4956 23.4417 19.1222 24.2352 19.9818C25.0287 20.8414 26.6074 20.6084 27.7613 19.4614C28.9153 18.3144 29.2074 16.6878 28.4139 15.8282Z' fill='%236B46FE'/%3e%3cpath d='M22.1027 28.9905C22.6104 28.8614 22.7137 27.4512 22.3334 25.8407C21.9531 24.2303 21.2332 23.0294 20.7254 23.1585C20.2177 23.2876 20.1144 24.6978 20.4947 26.3083C20.875 27.9187 21.5949 29.1196 22.1027 28.9905Z' fill='%236B46FE'/%3e%3cpath d='M16.9269 16.6152C18.3917 17.0567 19.4621 17.8312 19.3176 18.3452C19.1731 18.8591 17.8686 18.9179 16.4037 18.4764C14.9389 18.0349 13.8686 17.2603 14.0131 16.7464C14.1575 16.2324 15.4621 16.1737 16.9269 16.6152Z' fill='%236B46FE'/%3e%3cpath d='M26.4342 22.4188C27.9889 22.8874 29.1322 23.6839 28.9877 24.1979C28.8432 24.7118 27.4657 24.7486 25.911 24.28C24.3563 23.8114 23.213 23.0148 23.3575 22.5009C23.502 21.9869 24.8795 21.9502 26.4342 22.4188Z' fill='%236B46FE'/%3e%3cpath d='M18.5752 21.3404C18.2119 20.9555 17.0205 21.5157 15.914 22.5915C14.8075 23.6673 14.2049 24.8514 14.5682 25.2363C14.9314 25.6211 16.1229 25.061 17.2294 23.9852C18.3359 22.9094 18.9384 21.7253 18.5752 21.3404Z' fill='%236B46FE'/%3e%3cpath d='M16 39C21 39.0001 23.5 39.0001 28 39' stroke='%236B46FE' stroke-width='3' stroke-linecap='round'/%3e%3c/svg%3e" />
              </div>
  
              <p
                class="pera-wallet-connect-modal-desktop-mode__web-wallet__description">
                Connect with Pera Web to continue
              </p>
            </div>
  
            <button
              id="pera-wallet-connect-web-wallet-launch-button"
              class="pera-wallet-connect-modal-desktop-mode__web-wallet__launch-button">
              Launch Pera Web
  
              <img src="data:image/svg+xml,%3csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M13.0892 9.41009C13.4147 9.73553 13.4147 10.2632 13.0892 10.5886L8.08924 15.5886C7.7638 15.914 7.23616 15.914 6.91072 15.5886C6.58529 15.2632 6.58529 14.7355 6.91072 14.4101L11.3215 9.99935L6.91073 5.5886C6.58529 5.26317 6.58529 4.73553 6.91073 4.41009C7.23616 4.08466 7.7638 4.08466 8.08924 4.41009L13.0892 9.41009Z' fill='white'/%3e%3c/svg%3e" />
            </button>
          </div>`,s=`
  <div id="mobile-wallet-option" class="pera-wallet-accordion-item ${l?"pera-wallet-accordion-item--active":""}">
            <a class="pera-wallet-accordion-toggle">
            <button class="pera-wallet-accordion-toggle__button"></button>
  
              <img src="${k}" class="pera-wallet-accordion-icon" />
  
              <div class="pera-wallet-accordion-toggle__text">
                Connect with
  
                <span class="pera-wallet-accordion-toggle__bold-color">
                  Pera Mobile
                </span>
              </div>
            </a>
  
            <div class="pera-wallet-accordion-item__content">
              <div id="pera-wallet-connect-modal-connect-qr-code" class="pera-wallet-connect-qr-code-wrapper"></div>
  
              <div class="pera-wallet-connect-modal-desktop-mode__download-pera-container">
                <p
                  class="pera-wallet-connect-modal-desktop-mode__download-pera-description">
                    Don’t have Pera Wallet app?
                </p>
  
                <button
                  id="pera-wallet-connect-modal-desktop-mode-download-pera-button"
                  class="pera-wallet-connect-modal-desktop-mode__download-pera-button">
                  <img src="data:image/svg+xml,%3csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3crect x='2' y='2' width='4.66667' height='4.66667' rx='1.2' stroke='%236B46FE' stroke-width='1.5'/%3e%3crect x='2' y='9.33203' width='4.66667' height='4.66667' rx='1.2' stroke='%236B46FE' stroke-width='1.5'/%3e%3crect x='9.33325' y='2' width='4.66667' height='4.66667' rx='1.2' stroke='%236B46FE' stroke-width='1.5'/%3e%3cpath d='M8.70581 9.5293H10.9411' stroke='%236B46FE' stroke-width='1.66667' stroke-linejoin='round'/%3e%3cpath d='M13.1765 12.668L14.6667 12.668' stroke='%236B46FE' stroke-width='1.66667' stroke-linejoin='round'/%3e%3cpath d='M13.1765 14L14.6667 14' stroke='%236B46FE' stroke-width='1.66667' stroke-linejoin='round'/%3e%3cpath d='M11.686 14L13.1762 14' stroke='%236B46FE' stroke-width='1.66667' stroke-linejoin='round'/%3e%3cpath d='M12.4314 9.5293H14.6667' stroke='%236B46FE' stroke-width='1.66667' stroke-linejoin='round'/%3e%3cpath d='M8.70581 10.2754H12.4313' stroke='%236B46FE' stroke-width='1.25' stroke-linejoin='round'/%3e%3cpath d='M10.196 11.7656H11.6862' stroke='%236B46FE' stroke-width='1.25' stroke-linejoin='round'/%3e%3cpath d='M10.196 12.5117H11.6862' stroke='%236B46FE' stroke-width='1.25' stroke-linejoin='round'/%3e%3cpath d='M8.70581 13.2539H10.196' stroke='%236B46FE' stroke-width='1.25' stroke-linejoin='round'/%3e%3cpath d='M8.70581 14H10.196' stroke='%236B46FE' stroke-width='1.25' stroke-linejoin='round'/%3e%3cpath d='M10.196 11.0195H12.4313' stroke='%236B46FE' stroke-width='1.25' stroke-linejoin='round'/%3e%3c/svg%3e" alt="QR Icon" />
  
                  Download Pera Wallet
                </button>
              </div>
            </div>
          </div>`;return{mobileWalletOption:document.createRange().createContextualFragment(s),webWalletOption:document.createRange().createContextualFragment(u)}}(t);t?(n==null||n.appendChild(o),n==null||n.appendChild(a)):(n==null||n.appendChild(a),n==null||n.appendChild(o))}}connectedCallback(){var e;const n=this.getAttribute("should-display-new-badge"),t=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-web-new-label");n==="false"&&(t==null||t.setAttribute("style","display:none")),this.handleChangeView()}handleChangeView(){var e,n,t;const a=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-connect-modal-desktop-mode-download-pera-button"),o=(n=this.shadowRoot)===null||n===void 0?void 0:n.getElementById("pera-wallet-connect-modal-download-pera-view-back-button"),l=(t=this.shadowRoot)===null||t===void 0?void 0:t.getElementById("pera-wallet-connect-web-wallet-launch-button");a&&a.addEventListener("click",()=>{this.onClickDownload()}),o&&o.addEventListener("click",()=>{this.onClickBack()}),l&&l.addEventListener("click",()=>{this.webWalletConnect()}),this.renderQRCode(),this.checkWebWalletAvaliability()}webWalletConnect(){this.getAttribute("is-web-wallet-avaliable")==="true"&&window.onWebWalletConnect()}handleAccordion(e){var n,t;if(e.target instanceof Element){if(!e.target.classList.contains("pera-wallet-accordion-toggle__button"))return;if(this.shadowRoot&&(!((n=e.target.parentElement)===null||n===void 0)&&n.parentElement)){const a=(t=e.target.parentElement)===null||t===void 0?void 0:t.parentElement;if(!a||a.classList.contains("pera-wallet-accordion-item--active"))return;const o=this.shadowRoot.querySelectorAll(".pera-wallet-accordion-item.pera-wallet-accordion-item--active");for(let l=0;l<o.length;l++)o[l].classList.remove("pera-wallet-accordion-item--active");a.classList.toggle("pera-wallet-accordion-item--active")}}}renderQRCode(){var e;const n=this.getAttribute("is-web-wallet-avaliable"),t=this.getAttribute("compact-mode")==="true",a=this.getAttribute("single-account")==="true";let o=this.getAttribute("uri");a&&(o=`${o}&singleAccount=true`);let l=n==="false"?250:205;if(t&&(l=190),o){const u=new M({width:l,height:l,type:"svg",data:o,image:H,dotsOptions:{color:"#000",type:"extra-rounded"},imageOptions:{crossOrigin:"anonymous",margin:8},cornersSquareOptions:{type:"extra-rounded"},cornersDotOptions:{type:"dot"}}),s=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-connect-modal-connect-qr-code");s&&u.append(s)}}onClickDownload(){if(this.shadowRoot){const e=this.shadowRoot.getElementById("pera-wallet-connect-modal-desktop-mode");e&&(e.classList.remove("pera-wallet-connect-modal-desktop-mode--default"),e.classList.add("pera-wallet-connect-modal-desktop-mode--download"))}}onClickBack(){if(this.shadowRoot){const e=this.shadowRoot.getElementById("pera-wallet-connect-modal-desktop-mode");e&&(e.classList.add("pera-wallet-connect-modal-desktop-mode--default"),e.classList.remove("pera-wallet-connect-modal-desktop-mode--download"))}}checkWebWalletAvaliability(){var e;if(this.getAttribute("is-web-wallet-avaliable")==="false"){const n=(e=this.shadowRoot)===null||e===void 0?void 0:e.querySelector(".pera-wallet-connect-modal-desktop-mode__default-view");n==null||n.classList.add("pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable")}}}var v=`.pera-wallet-connect-modal-touch-screen-mode {
  display: grid;
  grid-template-columns: 1fr;
  gap: 46px;
  padding: 4px;
}

.pera-wallet-connect-modal-touch-screen-mode--pending-message-view {
  gap: 56px;
  grid-template-rows: auto 48px;
  height: 100%;
  padding-bottom: 70px;
}

.pera-wallet-connect-modal-touch-screen-mode__launch-pera-wallet-button,
.pera-wallet-connect-modal-touch-screen-mode__install-pera-wallet-button {
  display: block;
  padding: 14px;
  border-radius: 12px;
  text-decoration: none;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.09px;
  font-weight: 500;
}

.pera-wallet-connect-modal-touch-screen-mode__launch-pera-wallet-button {
  margin-bottom: 32px;
  background-color: #6b46fe;
  color: #ffffff;
}

.pera-wallet-connect-modal-touch-screen-mode__install-pera-wallet-button {
  margin-bottom: 20px;
  color: #6a6a81;
  background-color: #ffffff;
  box-shadow: 0px 0px 1px rgba(12, 26, 75, 0.24), 0px 3px 8px -1px rgba(50, 50, 71, 0.05);
}

.pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box {
  position: relative;
  margin-bottom: 32px;
  border-top: 1px solid #e6e8ee;
}

.pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box__text {
  position: absolute;
  top: -25px;
  right: calc(50% - 56px);
  width: 116px;
  color: #69708d;
  background-color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.04px;
  text-align: center;
}`;r(v);const m=document.createElement("template");class re extends HTMLElement{constructor(){var e;if(super(),this.attachShadow({mode:"open"}),m.innerHTML=`
  <div class="pera-wallet-connect-modal-touch-screen-mode">
    <pera-wallet-connect-modal-information-section></pera-wallet-connect-modal-information-section>

    <div>
      <a
        id="pera-wallet-connect-modal-touch-screen-mode-launch-pera-wallet-button"
        class="pera-wallet-connect-modal-touch-screen-mode__launch-pera-wallet-button"
        rel="noopener noreferrer"
        target="_blank">
        Launch Pera Wallet
      </a>

      <div
        class="pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box">
        <p
          class="pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box__text"
          >
          New to Pera?
        </p>
      </div>

      <a
        href="https://perawallet.app/download/"
        class="pera-wallet-connect-modal-touch-screen-mode__install-pera-wallet-button"
        rel="noopener noreferrer"
        target="_blank">
        Install Pera Wallet
      </a>
    </div>
  </div>
`,this.shadowRoot){const n=document.createElement("style");n.textContent=v,this.shadowRoot.append(m.content.cloneNode(!0),n);const t=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-connect-modal-touch-screen-mode-launch-pera-wallet-button"),a=this.getAttribute("uri"),o=this.getAttribute("single-account")==="true",l=this.getAttribute("selected-account")||void 0;t&&a&&(t.setAttribute("href",K(a,{singleAccount:o,selectedAccount:l})),t.addEventListener("click",()=>{this.onClickLaunch()}))}}onClickLaunch(){if(m.innerHTML=`
    <div class="pera-wallet-connect-modal-touch-screen-mode pera-wallet-connect-modal-touch-screen-mode--pending-message-view">
      <pera-wallet-connect-modal-pending-message-section should-use-sound="${this.getAttribute("should-use-sound")}"></pera-wallet-connect-modal-pending-message-section>
    </div>
  `,this.shadowRoot){const e=document.createElement("style");e.textContent=v,this.shadowRoot.innerHTML="",this.shadowRoot.append(m.content.cloneNode(!0),e)}}}var W=`@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
.pera-wallet-modal {
  --pera-wallet-modal-font-family: "Inter", sans-serif;
  --pera-wallet-modal-compact-width: 380px;
  --pera-wallet-modal-compact-height: 396px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 999999;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
}
.pera-wallet-modal--select-account .pera-wallet-modal__body {
  width: 480px;
  height: 578px;
  background-color: #ffffff;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body {
  position: absolute;
  top: unset;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: unset;
  padding: 20px;
  background-color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03);
  border-radius: 20px 20px 0px 0px;
  animation: 0.3s PeraWalletConnectMobileSlideIn ease-out;
  overflow-y: auto;
  transform: unset;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body::before {
  background-image: unset;
}
.pera-wallet-modal--compact:not(.pera-wallet-modal--mobile) .pera-wallet-modal__body {
  width: var(--pera-wallet-modal-compact-width);
  height: var(--pera-wallet-modal-compact-height);
  padding: 0;
}
.pera-wallet-modal * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--pera-wallet-modal-font-family);
  font-smooth: antialiased;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.pera-wallet-modal ul,
.pera-wallet-modal ol,
.pera-wallet-modal li {
  list-style-type: none;
}

.pera-wallet-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 48px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  font-family: var(--pera-wallet-modal-font-family);
  font-size: 14px;
}

.pera-wallet-modal__logo img {
  display: block;
  width: 32px;
}

.pera-wallet-modal__body {
  position: relative;
  top: 50%;
  left: 50%;
  width: 700px;
  max-width: calc(100vw - 80px);
  padding: 28px;
  background-color: #f3f3f7;
  box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.08);
  border-radius: 24px;
  animation: 0.3s PeraWalletConnectSlideIn ease-out;
  transform: translate(-50%, -50%);
}
.pera-wallet-modal__body::before {
  --background-line: #1e0972 0 1.2px, transparent 0 calc(100% - 1.2px), #1e0972;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  content: "";
  background-image: linear-gradient(var(--background-line)), linear-gradient(90deg, var(--background-line));
  background-size: 116px 116px;
  mix-blend-mode: overlay;
  border-radius: 24px;
  opacity: 0.8;
  pointer-events: none;
}

@media (max-width: 767px) {
  .pera-wallet-modal--desktop .pera-wallet-modal__body {
    width: 100%;
    max-width: calc(100vw - 32px);
    padding: 24px;
  }
}
@keyframes PeraWalletConnectSlideIn {
  0% {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 24px));
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes PeraWalletConnectMobileSlideIn {
  0% {
    bottom: -30%;
    opacity: 0;
  }
  100% {
    bottom: 0;
    opacity: 1;
  }
}`;r(W);const w=document.createElement("template");let h=c()?`${p} ${p}--mobile`:`${p} ${p}--desktop`;class de extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}connectedCallback(){this.shadowRoot&&this.render()}render(){if(!this.shadowRoot)return;const e=document.createElement("style");e.textContent=W,this.getAttribute("compact-mode")==="true"&&(h=`${h} ${p}--compact`);const n=this.getAttribute("single-account")==="true",t=this.getAttribute("selected-account")||void 0;c()?(w.innerHTML=`
          <div class="${h}">
            <div class="pera-wallet-modal__body" part="body">
              <pera-wallet-modal-header modal-id="${b}"></pera-wallet-modal-header/>
        
              <pera-wallet-modal-touch-screen-mode uri="${this.getAttribute("uri")}" should-use-sound="${this.getAttribute("should-use-sound")}" single-account="${n}" selected-account="${t}"></pera-wallet-modal-touch-screen-mode>
            </div>
          </div>
        `,this.shadowRoot.append(w.content.cloneNode(!0),e)):(w.innerHTML=`
        <div class="${h}">
          <div class="pera-wallet-modal__body">
            <pera-wallet-modal-header modal-id="${b}"></pera-wallet-modal-header/>
      
            <pera-wallet-modal-desktop-mode id="pera-wallet-modal-desktop-mode" uri="${this.getAttribute("uri")}" is-web-wallet-avaliable="${this.getAttribute("is-web-wallet-avaliable")}" should-display-new-badge="${this.getAttribute("should-display-new-badge")}" compact-mode="${this.getAttribute("compact-mode")}" promote-mobile="${this.getAttribute("promote-mobile")}" single-account="${n}"
        ></pera-wallet-modal-desktop-mode>
          </div>
        </div>
      `,this.shadowRoot.append(w.content.cloneNode(!0),e))}}var P=`@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
.pera-wallet-modal {
  --pera-wallet-modal-font-family: "Inter", sans-serif;
  --pera-wallet-modal-compact-width: 380px;
  --pera-wallet-modal-compact-height: 396px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 999999;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
}
.pera-wallet-modal--select-account .pera-wallet-modal__body {
  width: 480px;
  height: 578px;
  background-color: #ffffff;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body {
  position: absolute;
  top: unset;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: unset;
  padding: 20px;
  background-color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03);
  border-radius: 20px 20px 0px 0px;
  animation: 0.3s PeraWalletConnectMobileSlideIn ease-out;
  overflow-y: auto;
  transform: unset;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body::before {
  background-image: unset;
}
.pera-wallet-modal--compact:not(.pera-wallet-modal--mobile) .pera-wallet-modal__body {
  width: var(--pera-wallet-modal-compact-width);
  height: var(--pera-wallet-modal-compact-height);
  padding: 0;
}
.pera-wallet-modal * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--pera-wallet-modal-font-family);
  font-smooth: antialiased;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.pera-wallet-modal ul,
.pera-wallet-modal ol,
.pera-wallet-modal li {
  list-style-type: none;
}

.pera-wallet-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 48px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  font-family: var(--pera-wallet-modal-font-family);
  font-size: 14px;
}

.pera-wallet-modal__logo img {
  display: block;
  width: 32px;
}

.pera-wallet-modal__body {
  position: relative;
  top: 50%;
  left: 50%;
  width: 700px;
  max-width: calc(100vw - 80px);
  padding: 28px;
  background-color: #f3f3f7;
  box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.08);
  border-radius: 24px;
  animation: 0.3s PeraWalletConnectSlideIn ease-out;
  transform: translate(-50%, -50%);
}
.pera-wallet-modal__body::before {
  --background-line: #1e0972 0 1.2px, transparent 0 calc(100% - 1.2px), #1e0972;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  content: "";
  background-image: linear-gradient(var(--background-line)), linear-gradient(90deg, var(--background-line));
  background-size: 116px 116px;
  mix-blend-mode: overlay;
  border-radius: 24px;
  opacity: 0.8;
  pointer-events: none;
}

@media (max-width: 767px) {
  .pera-wallet-modal--desktop .pera-wallet-modal__body {
    width: 100%;
    max-width: calc(100vw - 32px);
    padding: 24px;
  }
}
@keyframes PeraWalletConnectSlideIn {
  0% {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 24px));
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes PeraWalletConnectMobileSlideIn {
  0% {
    bottom: -30%;
    opacity: 0;
  }
  100% {
    bottom: 0;
    opacity: 1;
  }
}
.pera-wallet-redirect-modal {
  display: grid;
  grid-template-columns: 1fr;
  gap: 56px;
  grid-template-rows: auto 48px;
  height: 100%;
  padding: 4px;
  padding-bottom: 70px;
}

.pera-wallet-redirect-modal__content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.pera-wallet-redirect-modal__content__title {
  margin: 20px 0 8px;
  color: #3c3c49;
  font-size: 18px;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: -0.26px;
}

.pera-wallet-redirect-modal__content__description,
.pera-wallet-redirect-modal__content__install-pera-text {
  color: #3c3c49;
  max-width: 271px;
  font-size: 14px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: -0.09px;
  text-align: center;
}

.pera-wallet-redirect-modal__content__description {
  margin-bottom: 24px;
}

.pera-wallet-redirect-modal__content__install-pera-text__link {
  color: #6b46fe;
  font-size: 14px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: -0.09px;
  text-align: center;
}

.pera-wallet-redirect-modal__launch-pera-wallet-button {
  display: block;
  padding: 14px;
  color: #ffffff;
  background-color: #6b46fe;
  border-radius: 12px;
  text-decoration: none;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.09px;
  font-weight: 500;
}`;r(P);const T=document.createElement("template");T.innerHTML=`
  <div class="pera-wallet-modal pera-wallet-modal--mobile">
    <div class="pera-wallet-modal__body">
      <pera-wallet-modal-header modal-id="${x}"></pera-wallet-modal-header/>

      <div class="pera-wallet-redirect-modal">
        <div class="pera-wallet-redirect-modal__content">
          <img src="data:image/svg+xml,%3csvg width='120' height='38' viewBox='0 0 120 38' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cg clip-path='url(%23clip0_38844_290434)'%3e%3cpath d='M103.739 28.6746H109.565' stroke='%236B46FE' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3e%3cpath d='M112.25 37H100.75C97.5731 37 95 34.2336 95 30.8182V9.18182C95 5.76636 97.5731 3 100.75 3H112.25C115.427 3 118 5.76636 118 9.18182V30.8182C118 34.2336 115.427 37 112.25 37Z' fill='%236B46FE' fill-opacity='0.1' stroke='%236B46FE' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3e%3crect y='1' width='36' height='36' rx='7.76829' fill='%236B46FE' fill-opacity='0.1'/%3e%3cpath d='M19.6057 9.47351C20.1851 11.8819 19.9967 14.0022 19.1848 14.2093C18.373 14.4164 17.2452 12.6319 16.6658 10.2235C16.0864 7.81514 16.2748 5.69486 17.0867 5.48775C17.8985 5.28063 19.0263 7.06512 19.6057 9.47351Z' fill='%236B46FE'/%3e%3cpath d='M29.0775 11.5213C27.8045 10.1593 25.2795 10.5358 23.4378 12.3621C21.5961 14.1885 21.1352 16.7732 22.4083 18.1352C23.6814 19.4972 26.2064 19.1207 28.048 17.2943C29.8897 15.4679 30.3506 12.8832 29.0775 11.5213Z' fill='%236B46FE'/%3e%3cpath d='M19.0324 32.4518C19.8443 32.2446 20.0039 30.0045 19.3889 27.4483C18.774 24.8921 17.6173 22.9877 16.8055 23.1948C15.9937 23.402 15.834 25.6421 16.449 28.1983C17.064 30.7545 18.2206 32.6589 19.0324 32.4518Z' fill='%236B46FE'/%3e%3cpath d='M10.7016 12.818C13.0471 13.5132 14.7627 14.739 14.5336 15.5559C14.3045 16.3728 12.2175 16.4714 9.87199 15.7762C7.52653 15.0809 5.81087 13.8551 6.03996 13.0383C6.26906 12.2214 8.35615 12.1228 10.7016 12.818Z' fill='%236B46FE'/%3e%3cpath d='M25.9365 21.9967C28.4259 22.7346 30.2583 23.995 30.0292 24.8119C29.8001 25.6287 27.5963 25.6927 25.1069 24.9548C22.6174 24.2169 20.7851 22.9565 21.0141 22.1397C21.2432 21.3228 23.447 21.2588 25.9365 21.9967Z' fill='%236B46FE'/%3e%3cpath d='M13.3578 20.316C12.775 19.7063 10.8709 20.6007 9.10487 22.3139C7.33879 24.0271 6.37952 25.9102 6.96226 26.5199C7.54501 27.1297 9.4491 26.2352 11.2152 24.522C12.9813 22.8089 13.9405 20.9258 13.3578 20.316Z' fill='%236B46FE'/%3e%3cpath d='M70.2098 10L75.3049 15.0945L52 15.0945' stroke='%23D0CAE7' stroke-width='3'/%3e%3cpath d='M60.7902 29.5945L55.6951 24.5L79 24.5' stroke='%23D0CAE7' stroke-width='3'/%3e%3c/g%3e%3cdefs%3e%3cclipPath id='clip0_38844_290434'%3e%3crect width='120' height='38' fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e" />

          <h1 class="pera-wallet-redirect-modal__content__title">
            Can't Launch Pera
          </h1>

          <p class="pera-wallet-redirect-modal__content__description">
            We couldn't redirect you to Pera Wallet automatically. Please try again.
          </p>

          <p class="pera-wallet-redirect-modal__content__install-pera-text">
            Don't have Pera Wallet installed yet?
            <br />
            
            <a
              id="pera-wallet-redirect-modal-download-pera-link"
              class="pera-wallet-redirect-modal__content__install-pera-text__link"
              href="https://perawallet.app/download/"
              rel="noopener noreferrer"
              target="_blank">
              Tap here to install.
            </a>
          </p>
        </div>

        <a
          id="pera-wallet-redirect-modal-launch-pera-link"
          class="pera-wallet-redirect-modal__launch-pera-wallet-button"
          rel="noopener noreferrer"
          target="_blank">
          Launch Pera Wallet
        </a>
      </div>
    </div>
  </div>
`;class ce extends HTMLElement{constructor(){var e,n;if(super(),this.attachShadow({mode:"open"}),this.shadowRoot){const t=document.createElement("style");t.textContent=P,this.shadowRoot.append(T.content.cloneNode(!0),t);const a=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-redirect-modal-download-pera-link");a==null||a.addEventListener("click",()=>{this.onClose()});const o=(n=this.shadowRoot)===null||n===void 0?void 0:n.getElementById("pera-wallet-redirect-modal-launch-pera-link");o==null||o.addEventListener("click",()=>{this.onClose(),window.open(y(),"_blank")})}}connectedCallback(){const e=window.open(y(),"_blank");e&&!e.closed&&this.onClose()}onClose(){f(x)}}var j="data:image/svg+xml,%3csvg width='32' height='35' viewBox='0 0 32 35' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M18.2837 5.09271C19.0234 8.12325 18.7827 10.7913 17.7463 11.0519C16.7098 11.3126 15.27 9.06712 14.5304 6.03657C13.7908 3.00603 14.0315 0.337996 15.0679 0.0773547C16.1044 -0.183287 17.5441 2.06216 18.2837 5.09271Z' fill='%233C3C49'/%3e%3cpath d='M30.376 7.66915C28.7507 5.95537 25.5271 6.42918 23.1759 8.72745C20.8247 11.0257 20.2361 14.2781 21.8614 15.9919C23.4866 17.7057 26.7102 17.2319 29.0614 14.9336C31.4127 12.6354 32.0012 9.38294 30.376 7.66915Z' fill='%233C3C49'/%3e%3cpath d='M17.5511 34.0071C18.5876 33.7465 18.7914 30.9276 18.0064 27.711C17.2214 24.4945 15.7448 22.0982 14.7084 22.3589C13.6719 22.6195 13.4681 25.4383 14.2531 28.6549C15.0381 31.8715 16.5147 34.2677 17.5511 34.0071Z' fill='%233C3C49'/%3e%3cpath d='M6.91617 9.3015C9.9105 10.1763 12.1008 11.7187 11.8083 12.7466C11.5158 13.7745 8.85126 13.8986 5.85693 13.0239C2.8626 12.1491 0.672334 10.6067 0.964835 9.57881C1.25734 8.5509 3.92184 8.42674 6.91617 9.3015Z' fill='%233C3C49'/%3e%3cpath d='M26.3656 20.8508C29.5437 21.7793 31.883 23.3652 31.5905 24.3932C31.298 25.4211 28.4845 25.5017 25.3063 24.5732C22.1282 23.6448 19.7889 22.0588 20.0814 21.0309C20.3739 20.003 23.1874 19.9224 26.3656 20.8508Z' fill='%233C3C49'/%3e%3cpath d='M10.3069 18.7365C9.56299 17.9692 7.13209 19.0948 4.87736 21.2506C2.62264 23.4064 1.39791 25.776 2.14185 26.5432C2.8858 27.3105 5.3167 26.1849 7.57143 24.0291C9.82615 21.8733 11.0509 19.5037 10.3069 18.7365Z' fill='%233C3C49'/%3e%3c/svg%3e",$=`.pera-wallet-connect-modal-information-section {
  padding: 12px;
  padding-right: 0;
}
.pera-wallet-connect-modal-information-section--mobile {
  padding: 0;
}
.pera-wallet-connect-modal-information-section--mobile .pera-wallet-connect-modal-information-section__pera-icon {
  margin-bottom: 16px;
}
.pera-wallet-connect-modal-information-section--mobile .pera-wallet-connect-modal-information-section__connect-pera-title {
  margin-bottom: 8px;
  color: #3c3c49;
  font-size: 18px;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: -0.2px;
}
.pera-wallet-connect-modal-information-section--mobile .pera-wallet-connect-modal-information-section__title {
  margin-bottom: 24px;
  color: #3c3c49;
  font-size: 14px;
  line-height: 24px;
  letter-spacing: -0.09px;
  font-weight: 400;
}
.pera-wallet-connect-modal-information-section--mobile .pera-wallet-connect-modal-information-section__features-item__icon-wrapper {
  background-color: #f2f3f8;
}
.pera-wallet-connect-modal-information-section--mobile .pera-wallet-connect-modal-information-section__features-item__description {
  color: #6a6a81;
}
.pera-wallet-connect-modal-information-section * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--pera-wallet-modal-font-family);
  font-smooth: antialiased;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.pera-wallet-connect-modal-information-section__pera-icon {
  margin-bottom: 32px;
}

.pera-wallet-connect-modal-information-section__title {
  margin-bottom: 148px;
  color: #3c3c49;
  font-size: 20px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.5px;
}

.pera-wallet-connect-modal-information-section__secondary-title {
  margin-bottom: 20px;
  color: #9d9dae;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  letter-spacing: 0.06px;
  text-transform: uppercase;
}

.pera-wallet-connect-modal-information-section__features-item {
  display: grid;
  align-items: center;
  grid-template-columns: 36px auto;
  gap: 16px;
}
.pera-wallet-connect-modal-information-section__features-item:not(:last-of-type) {
  margin-bottom: 24px;
}

.pera-wallet-connect-modal-information-section__features-item__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #ffffff;
  border-radius: 50%;
}

.pera-wallet-connect-modal-information-section__features-item__description {
  color: #6a6a81;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 0.01px;
}

@media (max-width: 767px) {
  .pera-wallet-connect-modal-information-section--desktop {
    padding: 0;
  }
  .pera-wallet-connect-modal-information-section--desktop .pera-wallet-connect-modal-information-section__pera-icon {
    margin-bottom: 12px;
  }
  .pera-wallet-connect-modal-information-section--desktop .pera-wallet-connect-modal-information-section__title {
    margin-bottom: 24px;
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
    letter-spacing: -0.26px;
  }
  .pera-wallet-connect-modal-information-section--desktop .pera-wallet-connect-modal-information-section__features-item {
    display: none;
  }
  .pera-wallet-connect-modal-information-section__secondary-title {
    display: none;
  }
}`;r($);const D=document.createElement("template"),pe=c()?"pera-wallet-connect-modal-information-section pera-wallet-connect-modal-information-section--mobile":"pera-wallet-connect-modal-information-section pera-wallet-connect-modal-information-section--desktop";D.innerHTML=`
  <section class="${pe}">
    <img
      id="pera-wallet-connect-modal-information-section-pera-icon"
      src="${j}"
      class="pera-wallet-connect-modal-information-section__pera-icon"
      alt="Pera Wallet Logo"
    />

    <h1 id="pera-wallet-connect-modal-information-section-connect-pera-mobile" class="pera-wallet-connect-modal-information-section__connect-pera-title">
        Connect to Pera Wallet
    </h1>

    <h1 class="pera-wallet-connect-modal-information-section__title">
      Simply the best Algorand wallet.
    </h1>

    <h2 id="pera-wallet-connect-modal-information-section-secondary-title" class="pera-wallet-connect-modal-information-section__secondary-title">
      Features
    </h2>

    <ul>
      <li class="pera-wallet-connect-modal-information-section__features-item">
        <div class="pera-wallet-connect-modal-information-section__features-item__icon-wrapper">
          <img src="data:image/svg+xml,%3csvg width='20' height='21' viewBox='0 0 20 21' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M2.5 10.1378C2.5 10.8378 3.025 11.6461 3.66667 11.9294L9.325 14.4461C9.75833 14.6378 10.25 14.6378 10.675 14.4461L16.3333 11.9294C16.975 11.6461 17.5 10.8378 17.5 10.1378M2.5 14.3044C2.5 15.0794 2.95833 15.7794 3.66667 16.0961L9.325 18.6128C9.75833 18.8044 10.25 18.8044 10.675 18.6128L16.3333 16.0961C17.0417 15.7794 17.5 15.0794 17.5 14.3044M10.8417 3.4043L15.7583 5.58763C17.175 6.21263 17.175 7.24596 15.7583 7.87096L10.8417 10.0543C10.2833 10.3043 9.36668 10.3043 8.80835 10.0543L3.89168 7.87096C2.47502 7.24596 2.47502 6.21263 3.89168 5.58763L8.80835 3.4043C9.36668 3.1543 10.2833 3.1543 10.8417 3.4043Z' stroke='%239D9DAE' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3e%3c/svg%3e" alt="Layer Icon" />
        </div>
        
        <p
          class="pera-wallet-connect-modal-information-section__features-item__description">
          Connect to any Algorand dApp securely
        </p>
      </li>

      <li class="pera-wallet-connect-modal-information-section__features-item">
        <div
          class="pera-wallet-connect-modal-information-section__features-item__icon-wrapper">
          <img src="data:image/svg+xml,%3csvg width='24' height='25' viewBox='0 0 24 25' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M9.58033 12.3109C9.28744 12.018 8.81257 12.018 8.51967 12.3109C8.22678 12.6038 8.22678 13.0787 8.51967 13.3716L9.58033 12.3109ZM10.66 14.4512L10.1297 14.9816C10.4226 15.2745 10.8974 15.2745 11.1903 14.9816L10.66 14.4512ZM15.4903 10.6816C15.7832 10.3887 15.7832 9.91381 15.4903 9.62092C15.1974 9.32803 14.7226 9.32803 14.4297 9.62092L15.4903 10.6816ZM19.84 8.09125C19.84 8.50546 20.1758 8.84125 20.59 8.84125C21.0042 8.84125 21.34 8.50546 21.34 8.09125H19.84ZM18.5 5.07125L18.2368 5.77355L18.2373 5.77375L18.5 5.07125ZM13.51 3.20125L13.7732 2.49894L13.7724 2.49866L13.51 3.20125ZM10.49 3.20125L10.2276 2.49865L10.2256 2.49941L10.49 3.20125ZM5.5 5.08125L5.76268 5.78375L5.76442 5.78309L5.5 5.08125ZM5.14 18.9612L4.69102 19.562L4.69135 19.5623L5.14 18.9612ZM9.44 22.1713L9.89069 21.5718L9.88866 21.5702L9.44 22.1713ZM14.58 22.1713L14.1313 21.5702L14.1293 21.5718L14.58 22.1713ZM18.88 18.9612L19.3287 19.5623L19.329 19.562L18.88 18.9612ZM21.36 8.09125C21.36 7.67704 21.0242 7.34125 20.61 7.34125C20.1958 7.34125 19.86 7.67704 19.86 8.09125H21.36ZM8.51967 13.3716L10.1297 14.9816L11.1903 13.9209L9.58033 12.3109L8.51967 13.3716ZM11.1903 14.9816L15.4903 10.6816L14.4297 9.62092L10.1297 13.9209L11.1903 14.9816ZM21.34 8.09125C21.34 7.29392 21.0398 6.50041 20.5931 5.85456C20.1463 5.20881 19.5097 4.64807 18.7627 4.36875L18.2373 5.77375C18.6403 5.92443 19.0487 6.25869 19.3595 6.70794C19.6702 7.15709 19.84 7.65858 19.84 8.09125H21.34ZM18.7632 4.36895L13.7732 2.49895L13.2468 3.90355L18.2368 5.77355L18.7632 4.36895ZM13.7724 2.49866C13.2479 2.30277 12.6051 2.21875 12 2.21875C11.3949 2.21875 10.7521 2.30277 10.2276 2.49866L10.7524 3.90384C11.0579 3.78973 11.5101 3.71875 12 3.71875C12.4899 3.71875 12.9421 3.78973 13.2476 3.90384L13.7724 2.49866ZM10.2256 2.49941L5.23558 4.37941L5.76442 5.78309L10.7544 3.90309L10.2256 2.49941ZM5.23733 4.37875C4.49043 4.65803 3.85398 5.2186 3.40741 5.86265C2.96095 6.50656 2.66 7.2978 2.66 8.09125H4.16C4.16 7.6647 4.32906 7.16594 4.64009 6.71735C4.95103 6.2689 5.35957 5.93447 5.76268 5.78375L5.23733 4.37875ZM2.66 8.09125V15.5212H4.16V8.09125H2.66ZM2.66 15.5212C2.66 16.2602 2.8989 17.059 3.24874 17.7545C3.59871 18.4503 4.09802 19.1188 4.69102 19.562L5.58899 18.3605C5.23198 18.0937 4.86629 17.6322 4.58877 17.0805C4.31111 16.5285 4.16 15.9623 4.16 15.5212H2.66ZM4.69135 19.5623L8.99135 22.7723L9.88866 21.5702L5.58866 18.3602L4.69135 19.5623ZM8.98932 22.7707C9.84721 23.4157 10.9462 23.7163 12.01 23.7163C13.0738 23.7163 14.1728 23.4157 15.0307 22.7707L14.1293 21.5718C13.5772 21.9868 12.8112 22.2163 12.01 22.2163C11.2088 22.2163 10.4428 21.9868 9.89068 21.5718L8.98932 22.7707ZM15.0287 22.7723L19.3287 19.5623L18.4313 18.3602L14.1313 21.5702L15.0287 22.7723ZM19.329 19.562C19.922 19.1188 20.4213 18.4503 20.7713 17.7545C21.1211 17.059 21.36 16.2602 21.36 15.5212H19.86C19.86 15.9623 19.7089 16.5285 19.4312 17.0805C19.1537 17.6322 18.788 18.0937 18.431 18.3605L19.329 19.562ZM21.36 15.5212V8.09125H19.86V15.5212H21.36Z' fill='%239D9DAE'/%3e%3c/svg%3e" alt="Tick Icon" />
        </div>

        <p
          class="pera-wallet-connect-modal-information-section__features-item__description">
          Your private keys are safely stored locally
        </p>
      </li>

      <li class="pera-wallet-connect-modal-information-section__features-item">
        <div
          class="pera-wallet-connect-modal-information-section__features-item__icon-wrapper">
          <img src="data:image/svg+xml,%3csvg width='20' height='21' viewBox='0 0 20 21' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M18.05 9.67014L17.3198 9.49894L18.05 9.67014ZM17.2333 13.1535L16.5031 12.9823L16.5029 12.9835L17.2333 13.1535ZM12.55 17.1285L12.6218 16.3818L12.6098 16.3809L12.55 17.1285ZM11.2 16.9035L11.376 16.1744L11.3737 16.1739L11.2 16.9035ZM9.8 16.5701L9.97372 15.8405L9.97324 15.8404L9.8 16.5701ZM6.06667 10.5451L6.79687 10.7163L6.79696 10.7159L6.06667 10.5451ZM6.88334 7.05347L6.15327 6.88169L6.15304 6.88267L6.88334 7.05347ZM7.5 5.22014L8.17303 5.55114L8.17523 5.54659L7.5 5.22014ZM12.9167 3.32014L12.744 4.05L12.7461 4.05049L12.9167 3.32014ZM14.3083 3.64514L14.4791 2.91485L14.4789 2.91479L14.3083 3.64514ZM10.5917 18.0285L10.359 17.3155L10.3572 17.3161L10.5917 18.0285ZM9.27501 18.4618L9.50516 19.1756L9.50947 19.1742L9.27501 18.4618ZM3.15001 15.3285L2.43654 15.5597L2.43672 15.5603L3.15001 15.3285ZM2.08334 12.0368L1.36953 12.267L1.36987 12.268L2.08334 12.0368ZM5.20834 5.91182L5.43849 6.62565L5.44281 6.62423L5.20834 5.91182ZM6.52501 5.47848L6.29831 4.76352L6.29055 4.76608L6.52501 5.47848ZM10.7177 7.35149C10.3162 7.24967 9.90818 7.49261 9.80635 7.89411C9.70453 8.29561 9.94746 8.70364 10.349 8.80546L10.7177 7.35149ZM14.3906 9.83046C14.7921 9.93229 15.2002 9.68935 15.302 9.28785C15.4038 8.88635 15.1609 8.47832 14.7594 8.37649L14.3906 9.83046ZM9.90211 10.5768C9.50076 10.4743 9.09238 10.7167 8.98996 11.118C8.88755 11.5194 9.12988 11.9278 9.53124 12.0302L9.90211 10.5768ZM11.9479 12.6469C12.3493 12.7493 12.7576 12.5069 12.8601 12.1056C12.9625 11.7042 12.7201 11.2958 12.3188 11.1934L11.9479 12.6469ZM17.3198 9.49894L16.5031 12.9823L17.9635 13.3247L18.7802 9.84133L17.3198 9.49894ZM16.5029 12.9835C16.168 14.4224 15.6979 15.2955 15.1165 15.793C14.5605 16.2688 13.7912 16.4944 12.6218 16.3819L12.4782 17.875C13.9088 18.0126 15.1312 17.7548 16.0918 16.9327C17.0271 16.1323 17.5986 14.8928 17.9638 13.3234L16.5029 12.9835ZM12.6098 16.3809C12.2388 16.3512 11.8281 16.2835 11.376 16.1744L11.024 17.6325C11.5386 17.7567 12.0279 17.8391 12.4902 17.8761L12.6098 16.3809ZM11.3737 16.1739L9.97372 15.8405L9.62629 17.2997L11.0263 17.6331L11.3737 16.1739ZM9.97324 15.8404C8.30732 15.4449 7.40652 14.876 6.96107 14.1588C6.51616 13.4425 6.40566 12.385 6.79687 10.7163L5.33647 10.3739C4.91101 12.1887 4.92968 13.7311 5.68685 14.9502C6.44349 16.1685 7.81769 16.8704 9.62676 17.2999L9.97324 15.8404ZM6.79696 10.7159L7.61363 7.22428L6.15304 6.88267L5.33638 10.3743L6.79696 10.7159ZM7.6134 7.22525C7.77277 6.54795 7.95691 5.99053 8.17301 5.55113L6.82699 4.88915C6.54309 5.46641 6.32724 6.14234 6.15327 6.88169L7.6134 7.22525ZM8.17523 5.54659C8.59604 4.67619 9.11898 4.20234 9.77488 3.97598C10.4657 3.73759 11.4133 3.73525 12.744 4.05L13.0893 2.59028C11.6367 2.2467 10.3635 2.18603 9.28554 2.55805C8.17269 2.94211 7.37896 3.74743 6.82478 4.89369L8.17523 5.54659ZM12.7461 4.05049L14.1378 4.37549L14.4789 2.91479L13.0872 2.58979L12.7461 4.05049ZM14.1375 4.37543C15.8111 4.76687 16.7126 5.33603 17.1575 6.05304C17.6023 6.77006 17.7112 7.82942 17.3198 9.49894L18.7802 9.84133C19.2054 8.02753 19.1893 6.48272 18.4321 5.26224C17.6749 4.04175 16.2972 3.34008 14.4791 2.91485L14.1375 4.37543ZM12.1294 16.5075C11.6911 16.8045 11.1123 17.0697 10.359 17.3155L10.8243 18.7415C11.6544 18.4706 12.3756 18.1525 12.9706 17.7494L12.1294 16.5075ZM10.3572 17.3161L9.04055 17.7494L9.50947 19.1742L10.8261 18.7409L10.3572 17.3161ZM9.04486 17.748C7.46037 18.2589 6.43607 18.2362 5.71663 17.8681C4.99693 17.4999 4.37829 16.6816 3.8633 15.0967L2.43672 15.5603C2.99673 17.2837 3.78642 18.5654 5.03339 19.2035C6.28062 19.8416 7.78131 19.7314 9.50516 19.1756L9.04486 17.748ZM3.86348 15.0973L2.79682 11.8056L1.36987 12.268L2.43654 15.5597L3.86348 15.0973ZM2.79716 11.8067C2.28607 10.2215 2.3068 9.19457 2.67362 8.4739C3.03983 7.75443 3.85506 7.13616 5.43849 6.62563L4.9782 5.198C3.25329 5.75414 1.97269 6.54421 1.33682 7.79348C0.701551 9.04157 0.813948 10.5438 1.36953 12.267L2.79716 11.8067ZM5.44281 6.62423L6.75947 6.19089L6.29055 4.76608L4.97388 5.19941L5.44281 6.62423ZM6.75169 6.19341C7.08205 6.08866 7.37424 6.00724 7.63942 5.95707L7.36058 4.48321C7.00909 4.54971 6.6513 4.65164 6.29833 4.76356L6.75169 6.19341ZM10.349 8.80546L14.3906 9.83046L14.7594 8.37649L10.7177 7.35149L10.349 8.80546ZM9.53124 12.0302L11.9479 12.6469L12.3188 11.1934L9.90211 10.5768L9.53124 12.0302Z' fill='%239D9DAE'/%3e%3c/svg%3e" alt="Note Icon" />
        </div>

        <p
          class="pera-wallet-connect-modal-information-section__features-item__description">
          View NFTs, buy and swap crypto and more
        </p>
      </li>
    </ul>
  </section>
`;class se extends HTMLElement{constructor(){var e,n,t,a;super(),this.attachShadow({mode:"open"});const o=((e=document.querySelector("pera-wallet-connect-modal"))===null||e===void 0?void 0:e.getAttribute("compact-mode"))==="true";if(this.shadowRoot&&(!o&&!c()||c())){const l=document.createElement("style");l.textContent=$,this.shadowRoot.append(D.content.cloneNode(!0),l),c()?(n=this.shadowRoot.getElementById("pera-wallet-connect-modal-information-section-title"))===null||n===void 0||n.setAttribute("style","display: none;"):((t=this.shadowRoot.getElementById("pera-wallet-connect-modal-information-section-pera-icon"))===null||t===void 0||t.setAttribute("src","data:image/svg+xml,%3csvg width='84' height='38' viewBox='0 0 84 38' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M19.806 8.62773C20.4416 11.2609 20.2268 13.5772 19.3262 13.8012C18.4256 14.0253 17.1803 12.0723 16.5448 9.43906C15.9092 6.80585 16.1241 4.48959 17.0246 4.26555C17.9252 4.04151 19.1705 5.99452 19.806 8.62773Z' fill='%233C3C49'/%3e%3cpath d='M30.3007 10.8917C28.8932 9.3999 26.0929 9.80424 24.0461 11.7948C21.9994 13.7853 21.4812 16.6082 22.8887 18.1C24.2962 19.5917 27.0964 19.1874 29.1432 17.1969C31.1899 15.2064 31.7082 12.3834 30.3007 10.8917Z' fill='%233C3C49'/%3e%3cpath d='M19.1061 33.734C20.0067 33.5099 20.1899 31.0627 19.5153 28.2678C18.8408 25.473 17.5639 23.3889 16.6633 23.613C15.7627 23.837 15.5795 26.2843 16.2541 29.0791C16.9286 31.874 18.2056 33.958 19.1061 33.734Z' fill='%233C3C49'/%3e%3cpath d='M9.92571 12.2574C12.5239 13.0236 14.4224 14.3678 14.1662 15.2597C13.9099 16.1517 11.5959 16.2536 8.99771 15.4874C6.3995 14.7212 4.50098 13.377 4.75724 12.4851C5.0135 11.5931 7.3275 11.4912 9.92571 12.2574Z' fill='%233C3C49'/%3e%3cpath d='M26.7892 22.3292C29.5469 23.1424 31.5747 24.5247 31.3184 25.4167C31.0621 26.3086 28.6189 26.3724 25.8612 25.5592C23.1035 24.7459 21.0757 23.3636 21.3319 22.4717C21.5882 21.5797 24.0315 21.5159 26.7892 22.3292Z' fill='%233C3C49'/%3e%3cpath d='M12.8493 20.4577C12.205 19.7898 10.0916 20.7619 8.12896 22.6289C6.16631 24.4959 5.09759 26.5509 5.7419 27.2188C6.38622 27.8867 8.49958 26.9146 10.4622 25.0476C12.4249 23.1806 13.4936 21.1256 12.8493 20.4577Z' fill='%233C3C49'/%3e%3cpath d='M41.691 12.5347V11.9635H39.3366V27.1957H41.691V23.0915C41.691 22.6472 41.691 22.2876 41.6482 21.801H41.691C42.5471 23.1973 44.0026 23.9377 45.7148 23.9377C48.6043 23.9377 51.1299 21.7587 51.1299 17.7179C51.1299 13.7617 48.6043 11.625 45.7148 11.625C44.0668 11.625 42.6113 12.3443 41.691 13.7617H41.6482C41.691 13.2963 41.691 12.9578 41.691 12.5347ZM45.1155 21.9279C42.9324 21.9068 41.6696 20.0662 41.6696 17.6967C41.6696 15.4542 42.9324 13.656 45.1155 13.6348C47.2559 13.6137 48.6685 15.2638 48.6685 17.7179C48.6685 20.2354 47.2559 21.9491 45.1155 21.9279Z' fill='%233C3C49'/%3e%3cpath d='M63.4932 16.7236C63.4932 13.8041 61.1388 11.625 57.9283 11.625C54.5037 11.625 52.1279 13.931 52.1279 17.7814C52.1279 21.4836 54.4609 23.9377 57.9283 23.9377C60.7749 23.9377 62.8939 22.2876 63.3862 20.0239H60.8177C60.4111 21.1663 59.2981 21.9279 57.9283 21.9279C56.1732 21.9279 54.889 20.6797 54.6107 18.6064H63.4932V16.7236ZM57.9283 13.6348C59.662 13.6348 60.8606 14.8195 61.1174 16.5332H54.6321C54.9318 14.883 56.1518 13.6348 57.9283 13.6348Z' fill='%233C3C49'/%3e%3cpath d='M65.224 23.5992H67.5784V17.0409C67.5784 14.7984 68.8198 13.6348 70.7462 13.6348H72.009V11.625H71.003C69.2693 11.625 68.1991 12.7674 67.5784 13.7617H67.5356V11.9635H65.224V23.5992Z' fill='%233C3C49'/%3e%3cpath d='M83.0154 21.5683C82.6944 21.5683 82.5445 21.3779 82.5445 20.9971V15.8773C82.5445 13.4233 81.3459 11.625 77.8144 11.625C74.3898 11.625 72.8273 13.3175 72.6561 15.7292H75.0105C75.1603 14.4176 76.2091 13.6348 77.8144 13.6348C79.1842 13.6348 80.1259 14.2272 80.1259 15.158C80.1259 15.9196 79.5909 16.3851 77.8358 16.3851H76.894C74.0901 16.3851 72.2066 17.5063 72.2066 20.0662C72.2066 22.753 74.1972 23.98 76.5301 23.98C78.2638 23.98 79.7407 23.2184 80.3186 21.5894C80.3828 22.7742 81.1747 23.5992 82.673 23.5992H84V21.5683H83.0154ZM80.1902 18.1833C80.1902 20.8067 78.7561 21.9491 76.9154 21.9491C75.3101 21.9491 74.668 21.0182 74.668 20.0662C74.668 19.1565 75.2245 18.416 76.9368 18.416H77.2793C78.9273 18.416 79.9547 17.8448 80.1688 16.8505H80.1902V18.1833Z' fill='%233C3C49'/%3e%3c/svg%3e"),(a=this.shadowRoot.getElementById("pera-wallet-connect-modal-information-section-connect-pera-mobile"))===null||a===void 0||a.setAttribute("style","display: none;"))}}}var C=`@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
.pera-wallet-modal {
  --pera-wallet-modal-font-family: "Inter", sans-serif;
  --pera-wallet-modal-compact-width: 380px;
  --pera-wallet-modal-compact-height: 396px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 999999;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
}
.pera-wallet-modal--select-account .pera-wallet-modal__body {
  width: 480px;
  height: 578px;
  background-color: #ffffff;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body {
  position: absolute;
  top: unset;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: unset;
  padding: 20px;
  background-color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03);
  border-radius: 20px 20px 0px 0px;
  animation: 0.3s PeraWalletConnectMobileSlideIn ease-out;
  overflow-y: auto;
  transform: unset;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body::before {
  background-image: unset;
}
.pera-wallet-modal--compact:not(.pera-wallet-modal--mobile) .pera-wallet-modal__body {
  width: var(--pera-wallet-modal-compact-width);
  height: var(--pera-wallet-modal-compact-height);
  padding: 0;
}
.pera-wallet-modal * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--pera-wallet-modal-font-family);
  font-smooth: antialiased;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.pera-wallet-modal ul,
.pera-wallet-modal ol,
.pera-wallet-modal li {
  list-style-type: none;
}

.pera-wallet-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 48px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  font-family: var(--pera-wallet-modal-font-family);
  font-size: 14px;
}

.pera-wallet-modal__logo img {
  display: block;
  width: 32px;
}

.pera-wallet-modal__body {
  position: relative;
  top: 50%;
  left: 50%;
  width: 700px;
  max-width: calc(100vw - 80px);
  padding: 28px;
  background-color: #f3f3f7;
  box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.08);
  border-radius: 24px;
  animation: 0.3s PeraWalletConnectSlideIn ease-out;
  transform: translate(-50%, -50%);
}
.pera-wallet-modal__body::before {
  --background-line: #1e0972 0 1.2px, transparent 0 calc(100% - 1.2px), #1e0972;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  content: "";
  background-image: linear-gradient(var(--background-line)), linear-gradient(90deg, var(--background-line));
  background-size: 116px 116px;
  mix-blend-mode: overlay;
  border-radius: 24px;
  opacity: 0.8;
  pointer-events: none;
}

@media (max-width: 767px) {
  .pera-wallet-modal--desktop .pera-wallet-modal__body {
    width: 100%;
    max-width: calc(100vw - 32px);
    padding: 24px;
  }
}
@keyframes PeraWalletConnectSlideIn {
  0% {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 24px));
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes PeraWalletConnectMobileSlideIn {
  0% {
    bottom: -30%;
    opacity: 0;
  }
  100% {
    bottom: 0;
    opacity: 1;
  }
}
.pera-wallet-connect-modal-pending-message-section {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 48px;
  gap: 56px;
  height: 100%;
  padding: 4px;
  padding-bottom: 70px;
}

.pera-wallet-connect-modal-pending-message {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}
.pera-wallet-connect-modal-pending-message--try-again-view {
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  height: 100%;
  margin-top: 10px;
}
.pera-wallet-connect-modal-pending-message--try-again-view__title {
  margin: 16px 0 12px;
  color: #3c3c49;
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.26px;
}
.pera-wallet-connect-modal-pending-message--try-again-view__description {
  color: #6a6a81;
  font-size: 14px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: -0.01px;
}
.pera-wallet-connect-modal-pending-message--try-again-view__button {
  display: block;
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  text-decoration: none;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.09px;
  font-weight: 500;
  color: #ffffff;
  background-color: #6b46fe;
  border: none;
}
.pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #ffffff;
  box-shadow: 0px 0px 1px rgba(12, 26, 75, 0.24), 0px 3px 8px -1px rgba(50, 50, 71, 0.05);
  border-radius: 12px;
  text-decoration: none;
}
.pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__image {
  width: 24px;
  height: 24px;
}
.pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.1px;
  color: #3c3c49;
}
.pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__description {
  /* stylelint-disable value-no-vendor-prefix */
  /* stylelint-disable  property-no-vendor-prefix */
  display: -webkit-box;
  max-width: 100%;
  -webkit-line-clamp: 2;
  /* autoprefixer: ignore next */
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* stylelint-enable value-no-vendor-prefix */
  /* stylelint-enable property-no-vendor-prefix */
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  letter-spacing: 0.01px;
  color: #9d9dae;
}

.pera-wallet-connect-modal-pending-message__animation-wrapper {
  width: 56px;
  height: 56px;
  background-color: #6b46fe;
  border-radius: 50%;
}

.pera-wallet-connect-modal-pending-message__text {
  max-width: 271px;
  margin-top: 24px;
  color: #3c3c49;
  font-size: 18px;
  font-weight: 500;
  line-height: 28px;
  letter-spacing: -0.26px;
}

.pera-wallet-connect-modal-pending-message__cancel-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px;
  color: #6a6a81;
  background-color: #ffffff;
  box-shadow: 0px 0px 1px rgba(12, 26, 75, 0.24), 0px 3px 8px -1px rgba(50, 50, 71, 0.05);
  border-radius: 12px;
  text-decoration: none;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.09px;
  font-weight: 500;
  border: none;
}`;r(C);const g=document.createElement("template");g.innerHTML=`
  <div class="pera-wallet-connect-modal-pending-message-section">
    <div class="pera-wallet-connect-modal-pending-message">
      <div id="pera-wallet-connect-modal-pending-message-animation-wrapper" class="pera-wallet-connect-modal-pending-message__animation-wrapper"></div>

      <div class="pera-wallet-connect-modal-pending-message__text">
        Please wait while we connect you to Pera Wallet
      </div>
    </div>

    <button
      id="pera-wallet-connect-modal-pending-message-cancel-button"
      class="pera-wallet-button pera-wallet-connect-modal-pending-message__cancel-button">
        Cancel
    </button>
  </div>

  <div id="pera-wallet-connect-modal-pending-message-audio-wrapper"></div>
`;const me=`
  <div class="pera-wallet-connect-modal-pending-message--try-again-view">
    <div>
      <img src="${j}" alt="Pera Wallet Logo" />

      <h1 class="pera-wallet-connect-modal-pending-message--try-again-view__title">
        Couldn’t establish connection
      </h1>

      <p class="pera-wallet-connect-modal-pending-message--try-again-view__description">
        Having issues? Before trying again, make sure to read the support article below and apply the possible solutions.
      </p>
    </div>

    <div>
      <a
        href="https://support.perawallet.app/en/article/resolving-walletconnect-issues-1tolptm/"
        target="_blank"
        rel="noopener noreferrer"
        class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor">
        <img
          class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__image"
          src="data:image/svg+xml,%3csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M8 22.3199C7.72 22.3199 7.42998 22.2499 7.16998 22.1099C6.59998 21.8099 6.25 21.2099 6.25 20.5699V19.15C3.23 18.84 1.25 16.6199 1.25 13.4399V7.43994C1.25 3.99994 3.56 1.68994 7 1.68994H17C20.44 1.68994 22.75 3.99994 22.75 7.43994V13.4399C22.75 16.8799 20.44 19.1899 17 19.1899H13.23L8.96997 22.03C8.67997 22.22 8.34 22.3199 8 22.3199ZM7 3.17993C4.42 3.17993 2.75 4.84993 2.75 7.42993V13.43C2.75 16.01 4.42 17.68 7 17.68C7.41 17.68 7.75 18.02 7.75 18.43V20.56C7.75 20.69 7.83 20.75 7.88 20.78C7.93001 20.81 8.03001 20.84 8.14001 20.77L12.59 17.81C12.71 17.73 12.86 17.68 13.01 17.68H17.01C19.59 17.68 21.26 16.01 21.26 13.43V7.42993C21.26 4.84993 19.59 3.17993 17.01 3.17993H7ZM11.9998 12.11C11.5898 12.11 11.2498 11.77 11.2498 11.36V11.15C11.2498 10.0038 12.0798 9.4336 12.4082 9.20798L12.4198 9.20001C12.7898 8.95001 12.9098 8.78002 12.9098 8.52002C12.9098 8.02002 12.4998 7.60999 11.9998 7.60999C11.4998 7.60999 11.0898 8.02002 11.0898 8.52002C11.0898 8.93002 10.7498 9.27002 10.3398 9.27002C9.92984 9.27002 9.58984 8.93002 9.58984 8.52002C9.58984 7.19002 10.6698 6.10999 11.9998 6.10999C13.3298 6.10999 14.4098 7.19002 14.4098 8.52002C14.4098 9.66002 13.5698 10.23 13.2598 10.44C12.8698 10.7 12.7498 10.87 12.7498 11.15V11.36C12.7498 11.78 12.4098 12.11 11.9998 12.11ZM11.25 13.85C11.25 14.26 11.58 14.6 12 14.6C12.42 14.6 12.75 14.26 12.75 13.85C12.75 13.44 12.41 13.1 12 13.1C11.59 13.1 11.25 13.44 11.25 13.85Z' fill='%236B46FE'/%3e%3c/svg%3e"
          alt="Help Icon"
        />

        <div>
          <div
            class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title-wrapper">
            <h1
              class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title">
                Resolving WalletConnect issues
            </h1>

            <img src="data:image/svg+xml,%3csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M11.3287 10.0983C10.9574 10.0983 10.6564 9.79734 10.6564 9.42604L10.6564 6.29525L5.14866 11.803C4.88611 12.0655 4.46044 12.0655 4.19789 11.803C3.93534 11.5404 3.93534 11.1147 4.19789 10.8522L9.70561 5.34447L6.57482 5.34447C6.20352 5.34447 5.90252 5.04347 5.90252 4.67218C5.90252 4.30088 6.20352 3.99988 6.57482 3.99988L11.3287 3.99988C11.507 3.99988 11.678 4.07071 11.8041 4.19679C11.9301 4.32287 12.001 4.49387 12.001 4.67218L12.001 9.42604C12.001 9.79734 11.7 10.0983 11.3287 10.0983Z' fill='%239D9DAE'/%3e%3c/svg%3e" alt="Send Icon"/>
          </div>

          <p
            class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__description">
            Unfortunately there are several known issues related to WalletConnect that our team is working on. Some of these issues are related to the WalletConnect JavaScript implementation on the dApp ...
          </p>
        </div>
      </a>

      <button id="pera-wallet-connect-modal-pending-message-try-again-button" class="pera-wallet-connect-button pera-wallet-connect-modal-pending-message--try-again-view__button">
        Close & Try Again
      </button>
    </div>
  </div>
  `;class we extends HTMLElement{constructor(){if(super(),this.attachShadow({mode:"open"}),this.shadowRoot){const e=document.createElement("style");e.textContent=C,this.shadowRoot.append(g.content.cloneNode(!0),e)}}connectedCallback(){var e;const n=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-connect-modal-pending-message-cancel-button");n==null||n.addEventListener("click",()=>{this.onClose()}),this.addAudioForConnection(),this.renderLottieAnimation(),setTimeout(()=>{var t;if(g.innerHTML=me,this.shadowRoot){const a=document.createElement("style");a.textContent=C,this.shadowRoot.innerHTML="",this.shadowRoot.append(g.content.cloneNode(!0),a);const o=(t=this.shadowRoot)===null||t===void 0?void 0:t.getElementById("pera-wallet-connect-modal-pending-message-try-again-button");o==null||o.addEventListener("click",()=>{this.onClose()})}},3e4)}onClose(){f(b)}addAudioForConnection(){var e;if(this.getAttribute("should-use-sound")==="true"&&J()){const n=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-connect-modal-pending-message-audio-wrapper"),t=document.createElement("audio");t.src="https://s3.amazonaws.com/wc.perawallet.app/audio.mp3",t.autoplay=!0,t.loop=!0,n==null||n.appendChild(t)}}renderLottieAnimation(){var e;const n=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-connect-modal-pending-message-animation-wrapper");n&&z.loadAnimation({container:n,renderer:"svg",loop:!0,autoplay:!0,path:"https://s3.amazonaws.com/wc.perawallet.app/static/pera-loader-animation.json"})}}var O=`.pera-wallet-sign-txn-toast {
  --pera-wallet-sign-txn-toast-width: 422px;
  --pera-wallet-sign-txn-toast-height: 134px;
  --pera-wallet-sign-txn-toast-font-family: "Inter", sans-serif;
  position: fixed;
  bottom: 28px;
  right: 35px;
  z-index: 11;
  overflow: hidden;
  width: var(--pera-wallet-sign-txn-toast-width);
  height: var(--pera-wallet-sign-txn-toast-height);
  background: #edeffb;
  border-radius: 8px;
  animation: 0.2s PeraWalletSignTxnToastSlideIn ease-out;
}
.pera-wallet-sign-txn-toast * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--pera-wallet-sign-txn-toast-font-family);
  font-smooth: antialiased;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.pera-wallet-sign-txn-toast ul,
.pera-wallet-sign-txn-toast ol,
.pera-wallet-sign-txn-toast li {
  list-style-type: none;
}

.pera-wallet-sign-txn-toast__header__close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.pera-wallet-sign-txn-toast__content__lottie-animation {
  position: absolute;
  top: -75px;
  left: -100px;
  width: 368px;
  height: 368px;
}

.pera-wallet-sign-txn-toast__content__description {
  position: absolute;
  top: 40px;
  right: 48px;
  max-width: 197px;
  color: #3c3c49;
  font-size: 14px;
  line-height: 22px;
  letter-spacing: -0.1px;
}

@media (max-width: 767px) {
  .pera-wallet-sign-txn-toast {
    display: none;
  }
}
@keyframes PeraWalletSignTxnToastSlideIn {
  0% {
    bottom: 12px;
    opacity: 0;
  }
  100% {
    bottom: 26px;
    opacity: 1;
  }
}`;r(O);const q=document.createElement("template");q.innerHTML=`
  <div class="pera-wallet-sign-txn-toast">
    <div class="pera-wallet-sign-txn-toast__header">
      <button
        id="pera-wallet-sign-txn-toast-close-button"
        class="pera-wallet-sign-txn-toast__header__close-button">
        <img src="data:image/svg+xml,%3csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M14.4107 4.41074L9.41074 9.41074L10.5893 10.5893L15.5893 5.58926L14.4107 4.41074ZM9.41074 9.41074L4.41074 14.4107L5.58926 15.5893L10.5893 10.5893L9.41074 9.41074ZM15.5893 14.4107L10.5893 9.41074L9.41074 10.5893L14.4107 15.5893L15.5893 14.4107ZM10.5893 9.41074L5.58926 4.41074L4.41074 5.58926L9.41074 10.5893L10.5893 9.41074Z' fill='%239099BD'/%3e%3c/svg%3e" />
      </button>
    </div>
    <div class="pera-wallet-sign-txn-toast__content">
      <div id="pera-wallet-sign-txn-toast-lottie-animation" style="width:368;height:368" class="pera-wallet-sign-txn-toast__content__lottie-animation"></div>
      <p class="pera-wallet-sign-txn-toast__content__description">
        Please launch <b>Pera Wallet</b> on your iOS or Android device to sign this transaction.
      </p>
    </div>
  </div>
`;class he extends HTMLElement{constructor(){if(super(),this.attachShadow({mode:"open"}),this.shadowRoot){const e=document.createElement("style");e.textContent=O,this.shadowRoot.append(q.content.cloneNode(!0),e);const n=this.shadowRoot.getElementById("pera-wallet-sign-txn-toast-close-button");n==null||n.addEventListener("click",()=>{f(Y)}),this.renderLottieAnimation()}}renderLottieAnimation(){var e;const n=(e=this.shadowRoot)===null||e===void 0?void 0:e.getElementById("pera-wallet-sign-txn-toast-lottie-animation");n&&z.loadAnimation({container:n,renderer:"svg",loop:!0,autoplay:!0,path:"https://s3.amazonaws.com/wc.perawallet.app/static/sign-toast-animation.json"})}}var U=`@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
.pera-wallet-modal {
  --pera-wallet-modal-font-family: "Inter", sans-serif;
  --pera-wallet-modal-compact-width: 380px;
  --pera-wallet-modal-compact-height: 396px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 999999;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
}
.pera-wallet-modal--select-account .pera-wallet-modal__body {
  width: 480px;
  height: 578px;
  background-color: #ffffff;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body {
  position: absolute;
  top: unset;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: unset;
  padding: 20px;
  background-color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03);
  border-radius: 20px 20px 0px 0px;
  animation: 0.3s PeraWalletConnectMobileSlideIn ease-out;
  overflow-y: auto;
  transform: unset;
}
.pera-wallet-modal--mobile .pera-wallet-modal__body::before {
  background-image: unset;
}
.pera-wallet-modal--compact:not(.pera-wallet-modal--mobile) .pera-wallet-modal__body {
  width: var(--pera-wallet-modal-compact-width);
  height: var(--pera-wallet-modal-compact-height);
  padding: 0;
}
.pera-wallet-modal * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--pera-wallet-modal-font-family);
  font-smooth: antialiased;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.pera-wallet-modal ul,
.pera-wallet-modal ol,
.pera-wallet-modal li {
  list-style-type: none;
}

.pera-wallet-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 48px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  font-family: var(--pera-wallet-modal-font-family);
  font-size: 14px;
}

.pera-wallet-modal__logo img {
  display: block;
  width: 32px;
}

.pera-wallet-modal__body {
  position: relative;
  top: 50%;
  left: 50%;
  width: 700px;
  max-width: calc(100vw - 80px);
  padding: 28px;
  background-color: #f3f3f7;
  box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.08);
  border-radius: 24px;
  animation: 0.3s PeraWalletConnectSlideIn ease-out;
  transform: translate(-50%, -50%);
}
.pera-wallet-modal__body::before {
  --background-line: #1e0972 0 1.2px, transparent 0 calc(100% - 1.2px), #1e0972;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  content: "";
  background-image: linear-gradient(var(--background-line)), linear-gradient(90deg, var(--background-line));
  background-size: 116px 116px;
  mix-blend-mode: overlay;
  border-radius: 24px;
  opacity: 0.8;
  pointer-events: none;
}

@media (max-width: 767px) {
  .pera-wallet-modal--desktop .pera-wallet-modal__body {
    width: 100%;
    max-width: calc(100vw - 32px);
    padding: 24px;
  }
}
@keyframes PeraWalletConnectSlideIn {
  0% {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 24px));
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes PeraWalletConnectMobileSlideIn {
  0% {
    bottom: -30%;
    opacity: 0;
  }
  100% {
    bottom: 0;
    opacity: 1;
  }
}
.pera-wallet-sign-txn-modal.pera-wallet-modal .pera-wallet-modal__body {
  width: 480px;
  height: 578px;
  background-color: #ffffff;
  background-image: unset;
  padding: 0;
}
.pera-wallet-sign-txn-modal.pera-wallet-modal .pera-wallet-modal__body .pera-wallet-sign-txn-modal__body__content {
  width: 100%;
  height: 100%;
}
.pera-wallet-sign-txn-modal.pera-wallet-modal .pera-wallet-modal__body #pera-wallet-iframe {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  margin: 0 auto;
  border: none;
}

.pera-wallet-sign-txn-modal--compact.pera-wallet-modal .pera-wallet-modal__body {
  width: var(--pera-wallet-modal-compact-width);
  height: var(--pera-wallet-modal-compact-height);
}`;r(U);const G=document.createElement("template");G.innerHTML=`
  <div id="pera-wallet-sign-txn-modal" class="${p} pera-wallet-sign-txn-modal">
    <div class="pera-wallet-modal__body">
      <pera-wallet-modal-header modal-id="${N}"></pera-wallet-modal-header/>

      <div class="pera-wallet-sign-txn-modal__body__content" />
    </div>
  </div>
`;class ge extends HTMLElement{constructor(){if(super(),this.attachShadow({mode:"open"}),this.shadowRoot){const e=document.createElement("style");if(e.textContent=U,this.shadowRoot.append(G.content.cloneNode(!0),e),this.getAttribute("compact-mode")==="true"){const n=this.shadowRoot.getElementById("pera-wallet-sign-txn-modal");n==null||n.classList.add("pera-wallet-sign-txn-modal--compact")}}}}function _(){document.documentElement.style.setProperty("--pera-wallet-vh",.01*window.innerHeight+"px")}function d(i,e){window.customElements.get(i)||window.customElements.define(i,e)}document.readyState==="complete"||document.readyState==="interactive"?_():window.addEventListener("DOMContentLoaded",()=>{_()}),window.addEventListener("resize",()=>{_()}),d("pera-wallet-connect-modal",de),d("pera-wallet-modal-desktop-mode",ie),d("pera-wallet-modal-header",oe),d("pera-wallet-modal-touch-screen-mode",re),d("pera-wallet-redirect-modal",ce),d("pera-wallet-connect-modal-information-section",se),d("pera-wallet-connect-modal-pending-message-section",we),d("pera-wallet-sign-txn-toast",he),d("pera-wallet-sign-txn-modal",ge),d("pera-wallet-download-qr-code",le);
