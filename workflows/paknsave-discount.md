
# Collect the discounted product of PaknSave

## Test case file
tests/test-cases/paknsave-discount.spec.ts

## Test steps

-   Start in a playwright test class
-   before all the test cases are started: loading the data file tests/data/paknsave-discount.json 
-   for each element in site-list：
    - read the url and open it in a new tab
    - read the site title and email array from json
    - read the location from json
    - click the select button on the page whose data-testid is "store-dropdown"
    - click the button
    - find input element and fill it with the location
    ```html
     <input class="m8owjo1 m8owjo3" id="_r_3a_" aria-invalid="false" aria-required="true" placeholder="Search for name/address of store" value="" style="padding-right: 40px;">
    ```
    - find the first store element with data-testid="delivery-choose-location-store"
    - inside the store element, find the buttion with data-testid="delivery-choose-location-store-select-store" and click it
    - find a button with data-testid="delivery-middle-button" and click it
    - then we are back to the original url page
    -  for each item in price-filter from json :
        - read the keyword, min-price and max-price from json
        - find the input element with data-testid="data-testid="search-bar-input"
        - find the result list element with data-testid="product-results"
        - find the first item in the result list who has a child element like
       ```html
       <a data-product-id="5211752-EA-000" class="_183v27u1" href="/shop/product/5211752_ea_000pns?name=auntie-dai%27s-chicken--coriander-dumplings"><div class="_183v27u2"><div class="_1buatj80"><img alt="Auntie Dai's Chicken &amp; Coriander Dumplings" loading="lazy" width="42" height="42" decoding="async" data-nimg="1" class="_1buatj82" src="https://a.fsimg.co.nz/product/retail/fan/image/100x100/5211752.png" style="color: transparent;"></div></div><p data-testid="product-result-product-name" class="_183v27u3 _10e5eu8r _10e5eu82i"><span class="_183v27u4"><span class="_10e5eu83r">Auntie </span><span class="_10e5eu83r">Dai's </span><span class="_10e5eu83r">Chicken </span><span class="_10e5eu83r">&amp; </span><span class="_10e5eu83r">Coriander </span><span class="_10e5eu83r">Dumplings </span></span><span class="_10e5eu83r _10e5eu850">ea</span></p></a>
       ```
       - click the item
       - enter a product detail page whose url start with "https://www.paknsave.co.nz/shop/product/"
       - read the price from the page
       - read the product title from the page
       - if the price is between min-price and max-price,
       - compare the price with the min-price and max-price from json,create InfoItemEntry with detail page url and Product title
       - for email in email array: notifyBuffer.add(siteTitle,InfoItemEntry,email)
       
   - end