const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function analyzeLagostina() {
    console.log('🚀 Démarrage de l\'analyse de Lagostina.fr...');
    
    // Créer le dossier de sortie s'il n'existe pas
    const outputDir = './screenshots';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Configuration pour capturer les requêtes CSS
    await page.setRequestInterception(true);
    const cssRequests = [];
    
    page.on('request', (request) => {
        if (request.resourceType() === 'stylesheet') {
            cssRequests.push(request.url());
        }
        request.continue();
    });

    try {
        console.log('📍 Navigation vers Lagostina.fr...');
        await page.goto('https://lagostina.fr', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('📸 Capture de la page d\'accueil...');
        await page.screenshot({
            path: path.join(outputDir, 'homepage-fullpage.png'),
            fullPage: true
        });

        console.log('📸 Capture de la zone visible de la page d\'accueil...');
        await page.screenshot({
            path: path.join(outputDir, 'homepage-viewport.png'),
            fullPage: false
        });

        // Analyse du header
        console.log('🔍 Analyse du HEADER...');
        const headerAnalysis = await page.evaluate(() => {
            const header = document.querySelector('header') || 
                          document.querySelector('.header') || 
                          document.querySelector('nav') ||
                          document.querySelector('[role="banner"]') ||
                          document.querySelector('#header');
            
            if (!header) return { error: 'Header non trouvé' };

            const getComputedStyles = (element) => {
                const computed = window.getComputedStyle(element);
                return {
                    backgroundColor: computed.backgroundColor,
                    color: computed.color,
                    borderColor: computed.borderColor,
                    padding: computed.padding,
                    margin: computed.margin,
                    height: computed.height,
                    display: computed.display,
                    position: computed.position,
                    zIndex: computed.zIndex,
                    boxShadow: computed.boxShadow,
                    fontSize: computed.fontSize,
                    fontFamily: computed.fontFamily,
                    fontWeight: computed.fontWeight
                };
            };

            return {
                outerHTML: header.outerHTML,
                styles: getComputedStyles(header),
                dimensions: header.getBoundingClientRect(),
                classes: Array.from(header.classList),
                id: header.id
            };
        });

        // Analyse des couleurs principales
        console.log('🎨 Extraction de la palette de couleurs...');
        const colorAnalysis = await page.evaluate(() => {
            const colors = new Set();
            const elements = document.querySelectorAll('*');
            
            elements.forEach(el => {
                const computed = window.getComputedStyle(el);
                if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    colors.add(computed.backgroundColor);
                }
                if (computed.color) {
                    colors.add(computed.color);
                }
                if (computed.borderColor && computed.borderColor !== 'rgb(0, 0, 0)') {
                    colors.add(computed.borderColor);
                }
            });

            // Convertir RGB vers HEX
            const rgbToHex = (rgb) => {
                const result = rgb.match(/\d+/g);
                if (!result) return rgb;
                return "#" + result.map(x => (+x).toString(16).padStart(2, '0')).join('');
            };

            return Array.from(colors).map(color => ({
                original: color,
                hex: rgbToHex(color)
            }));
        });

        // Recherche et navigation vers une page produit
        console.log('🔍 Recherche d\'une page produit...');
        
        // Chercher des liens vers des produits
        const productLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .filter(link => 
                    link.href.includes('produit') || 
                    link.href.includes('product') || 
                    link.href.includes('poele') || 
                    link.href.includes('casserole') ||
                    link.textContent.toLowerCase().includes('voir') ||
                    link.textContent.toLowerCase().includes('découvrir')
                )
                .slice(0, 5)
                .map(link => ({
                    href: link.href,
                    text: link.textContent.trim(),
                    title: link.title || ''
                }));
        });

        console.log('🔗 Liens produits trouvés:', productLinks);

        let productPageAnalysis = null;
        if (productLinks.length > 0) {
            try {
                console.log('📍 Navigation vers page produit:', productLinks[0].href);
                await page.goto(productLinks[0].href, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                await new Promise(resolve => setTimeout(resolve, 2000));

                console.log('📸 Capture de la page produit...');
                await page.screenshot({
                    path: path.join(outputDir, 'product-page.png'),
                    fullPage: true
                });

                // Analyse de la structure de la page produit
                productPageAnalysis = await page.evaluate(() => {
                    const product = {
                        title: document.querySelector('h1')?.textContent || '',
                        price: document.querySelector('[class*="price"], .prix')?.textContent || '',
                        description: document.querySelector('[class*="description"]')?.textContent || '',
                        images: Array.from(document.querySelectorAll('img')).map(img => img.src),
                        buttons: Array.from(document.querySelectorAll('button, .btn, [class*="button"]')).map(btn => ({
                            text: btn.textContent.trim(),
                            classes: Array.from(btn.classList),
                            styles: window.getComputedStyle(btn).backgroundColor
                        }))
                    };
                    return product;
                });
            } catch (error) {
                console.log('❌ Erreur navigation page produit:', error.message);
            }
        }

        // Recherche page de liste/recherche
        console.log('🔍 Recherche de page liste/recherche...');
        await page.goto('https://lagostina.fr', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const searchOrCategoryLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .filter(link => 
                    link.href.includes('categorie') || 
                    link.href.includes('category') || 
                    link.href.includes('collection') ||
                    link.href.includes('recherche') ||
                    link.href.includes('search') ||
                    link.textContent.toLowerCase().includes('tous') ||
                    link.textContent.toLowerCase().includes('catalogue')
                )
                .slice(0, 3)
                .map(link => ({
                    href: link.href,
                    text: link.textContent.trim()
                }));
        });

        let listingPageAnalysis = null;
        if (searchOrCategoryLinks.length > 0) {
            try {
                console.log('📍 Navigation vers page listing:', searchOrCategoryLinks[0].href);
                await page.goto(searchOrCategoryLinks[0].href, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                await new Promise(resolve => setTimeout(resolve, 2000));

                console.log('📸 Capture de la page listing...');
                await page.screenshot({
                    path: path.join(outputDir, 'listing-page.png'),
                    fullPage: true
                });

                listingPageAnalysis = await page.evaluate(() => {
                    return {
                        productCards: Array.from(document.querySelectorAll('[class*="product"], [class*="card"], .item')).length,
                        filters: Array.from(document.querySelectorAll('[class*="filter"], [class*="sidebar"]')).length,
                        pagination: document.querySelector('[class*="pagination"], .pagination') ? 'Présent' : 'Absent'
                    };
                });
            } catch (error) {
                console.log('❌ Erreur navigation page listing:', error.message);
            }
        }

        // Analyse du footer
        console.log('🔍 Analyse du FOOTER...');
        await page.goto('https://lagostina.fr', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const footerAnalysis = await page.evaluate(() => {
            const footer = document.querySelector('footer') || 
                          document.querySelector('.footer') ||
                          document.querySelector('[role="contentinfo"]');
            
            if (!footer) return { error: 'Footer non trouvé' };

            const getComputedStyles = (element) => {
                const computed = window.getComputedStyle(element);
                return {
                    backgroundColor: computed.backgroundColor,
                    color: computed.color,
                    padding: computed.padding,
                    margin: computed.margin,
                    borderTop: computed.borderTop
                };
            };

            return {
                outerHTML: footer.outerHTML.substring(0, 2000) + '...', // Limiter la taille
                styles: getComputedStyles(footer),
                links: Array.from(footer.querySelectorAll('a')).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href
                })),
                sections: Array.from(footer.querySelectorAll('section, div[class*="section"], .column')).length
            };
        });

        // Compilation du rapport
        const analysis = {
            timestamp: new Date().toISOString(),
            url: 'https://lagostina.fr',
            header: headerAnalysis,
            footer: footerAnalysis,
            colors: colorAnalysis,
            productPage: productPageAnalysis,
            listingPage: listingPageAnalysis,
            cssFiles: cssRequests,
            screenshots: {
                homepage_fullpage: 'screenshots/homepage-fullpage.png',
                homepage_viewport: 'screenshots/homepage-viewport.png',
                product_page: 'screenshots/product-page.png',
                listing_page: 'screenshots/listing-page.png'
            }
        };

        // Sauvegarder l'analyse
        fs.writeFileSync('./lagostina-analysis.json', JSON.stringify(analysis, null, 2));
        
        console.log('✅ Analyse terminée! Résultats sauvegardés dans lagostina-analysis.json');
        console.log('📸 Screenshots sauvegardés dans le dossier screenshots/');
        
        return analysis;

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Exécuter l'analyse
analyzeLagostina()
    .then(analysis => {
        console.log('\n🎉 ANALYSE TERMINÉE AVEC SUCCÈS!');
        console.log('📊 Statistiques:');
        console.log(`- ${analysis.colors.length} couleurs extraites`);
        console.log(`- ${analysis.cssFiles.length} fichiers CSS détectés`);
        console.log(`- Header ${analysis.header.error ? 'non trouvé' : 'analysé'}`);
        console.log(`- Footer ${analysis.footer.error ? 'non trouvé' : 'analysé'}`);
    })
    .catch(error => {
        console.error('💥 ÉCHEC DE L\'ANALYSE:', error.message);
        process.exit(1);
    });