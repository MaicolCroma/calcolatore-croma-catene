const { useState, useEffect } = React;
// Componenti icone semplici senza Lucide
const Calculator = () => <span>🧮</span>;
const Search = () => <span>🔍</span>;
const RotateCcw = () => <span>🔄</span>;
const Database = () => <span>💾</span>;
const Wifi = () => <span>📶</span>;
const WifiOff = () => <span>📵</span>;
const Download = () => <span>⬇️</span>;
const Upload = () => <span>⬆️</span>;
const Plus = () => <span>➕</span>;
const Edit3 = () => <span>✏️</span>;
const Trash2 = () => <span>🗑️</span>;
const Settings = () => <span>⚙️</span>;

// Database Manager per IndexedDB
class DatabaseManager {
  constructor() {
    this.dbName = 'JewelryCalculatorDB';
    this.version = 2; // Incrementata versione per nuove store
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store per BaseB3
        if (!db.objectStoreNames.contains('baseB3')) {
          const storeB3 = db.createObjectStore('baseB3', { keyPath: 'codice' });
          storeB3.createIndex('codice', 'codice', { unique: true });
        }
        
        // Store per BaseB4
        if (!db.objectStoreNames.contains('baseB4')) {
          const storeB4 = db.createObjectStore('baseB4', { keyPath: 'codice' });
          storeB4.createIndex('codice', 'codice', { unique: true });
        }
// Store per configurazioni (galvaniche, finiture, ecc)
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      };
    });
  }

  async addProduct(listino, prodotto) {
    const storeName = listino === 'Base B3' ? 'baseB3' : 'baseB4';
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.put(prodotto);
  }

  async getProduct(listino, codice) {
    try {
      const storeName = listino === 'Base B3' ? 'baseB3' : 'baseB4';
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(codice);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Errore in getProduct:', error);
      return null;
    }
  }

  async getAllProducts(listino) {
    try {
      const storeName = listino === 'Base B3' ? 'baseB3' : 'baseB4';
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Errore in getAllProducts:', error);
      return [];
    }
  }

  async deleteProduct(listino, codice) {
    const storeName = listino === 'Base B3' ? 'baseB3' : 'baseB4';
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.delete(codice);
  }

  async importData(data) {
    try {
      const stores = ['baseB3', 'baseB4'];
      const transaction = this.db.transaction(stores, 'readwrite');
      
      if (data.baseB3 && Array.isArray(data.baseB3)) {
        const storeB3 = transaction.objectStore('baseB3');
        for (const item of data.baseB3) {
          await new Promise((resolve, reject) => {
            const request = storeB3.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
        console.log('Importati', data.baseB3.length, 'prodotti in BaseB3');
      }
      
      if (data.baseB4 && Array.isArray(data.baseB4)) {
        const storeB4 = transaction.objectStore('baseB4');
        for (const item of data.baseB4) {
          await new Promise((resolve, reject) => {
            const request = storeB4.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
        console.log('Importati', data.baseB4.length, 'prodotti in BaseB4');
      }
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          console.log('Import completato con successo');
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Errore in importData:', error);
      throw error;
    }
  }

  async exportData() {
    try {
      const baseB3 = await this.getAllProducts('Base B3');
      const baseB4 = await this.getAllProducts('Base B4');
      
      return { baseB3, baseB4 };
    } catch (error) {
      console.error('Errore in exportData:', error);
      return { baseB3: [], baseB4: [] };
    }
  }
// Salva configurazione (galvaniche, finiture)
  async saveConfig(key, value) {
    try {
      const transaction = this.db.transaction(['config'], 'readwrite');
      const store = transaction.objectStore('config');
      await store.put({ key, value });
      return true;
    } catch (error) {
      console.error('Errore nel salvare config:', error);
      return false;
    }
  }

  // Carica configurazione
  async loadConfig(key) {
    try {
      const transaction = this.db.transaction(['config'], 'readonly');
      const store = transaction.objectStore('config');
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Errore nel caricare config:', error);
      return null;
    }
  }

}

const JewelryCalculator = () => {
  const [db, setDb] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTab, setCurrentTab] = useState('calculator');
  const [isLavorazioniUnlocked, setIsLavorazioniUnlocked] = useState(false);
  
  // Stati per il database
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  // Password per accesso lavorazioni (MODIFICABILE QUI)
  const LAVORAZIONI_PASSWORD = "croma2025";

  // Stati per lavorazioni
  const [galvaniche, setGalvaniche] = useState([
    { value: '', label: 'Nessuna', cost: 0 },
    { value: 'Argentatura', label: 'Argentatura', cost: 0.008 },
    { value: 'Brunito', label: 'Brunito', cost: 0.016 },
    { value: 'Dorato Flash', label: 'Dorato Flash', cost: 0.38 },
    { value: 'Dorato 1/2MC', label: 'Dorato 1/2MC', cost: 0.64 },
    { value: 'Dorato 1MC', label: 'Dorato 1MC', cost: 1.05 },
    { value: 'Ossidato', label: 'Ossidato', cost: 0.036 },
    { value: 'Platino', label: 'Platino', cost: 0.33 },
    { value: 'Rodio', label: 'Rodio', cost: 0.32 },
    { value: 'Rutenio', label: 'Rutenio', cost: 0.31 }
  ]);
  const [editingGalvanica, setEditingGalvanica] = useState(null);

  const [finitureState, setFinitureState] = useState([
    { value: '', label: 'Nessuna', cost: 0 },
    { value: 'Antitarnish', label: 'Antitarnish', cost: 0.008 },
    { value: 'Antitarnish Agere', label: 'Antitarnish Agere', cost: 0.055 },
    { value: 'E-Coating', label: 'E-Coating', cost: 0.030 },
    { value: 'Rocchetti', label: 'Rocchetti', cost: 0.006 }
  ]);
  const [editingFinitura, setEditingFinitura] = useState(null);

  // Stati principali del calcolatore
  const [codice, setCodice] = useState('');
  const [listino, setListino] = useState('Base B4');
  const [grammiMetro, setGrammiMetro] = useState('');
  const [manifatturaMetraggio, setManifatturaMetraggio] = useState('');
  const [grammi40cm, setGrammi40cm] = useState('');
  const [manifatturaFinito, setManifatturaFinito] = useState('');
  const [lunghezzaBracciale, setLunghezzaBracciale] = useState('');
  const [lunghezzaInch, setLunghezzaInch] = useState('');
  const [quotazioneMetallo, setQuotazioneMetallo] = useState('1.30');
  const [coloreGalvanica, setColoreGalvanica] = useState('');
  const [finitura, setFinitura] = useState('');
  const [quantitaMetraggio, setQuantitaMetraggio] = useState('');
  const [numeroPezzi, setNumeroPezzi] = useState('');
  const [grammiPezzi, setGrammiPezzi] = useState('');

  // Valori calcolati
  const [pesoCm, setPesoCm] = useState(0);
  const [totalePesoBracciale, setTotalePesoBracciale] = useState(0);
  const [costoGrammo, setCostoGrammo] = useState(0);
  const [costoGrammoMetraggio, setCostoGrammoMetraggio] = useState(0);
  const [totaleCostoBracciale, setTotaleCostoBracciale] = useState(0);
  const [costoMetraggio, setCostoMetraggio] = useState(0);
  const [metri1kg, setMetri1kg] = useState(0);
  const [pezziKg, setPezziKg] = useState(0);
  const [totaleGrammiPezzi, setTotaleGrammiPezzi] = useState(0);
  const [pezziGrammi, setPezziGrammi] = useState(0);

  // Opzioni per dropdown (ora usano lo stato galvaniche e finiture)
  const coloriGalvanica = galvaniche;

  const finiture = finitureState;

  // Inizializzazione database
 // Inizializzazione database
  useEffect(() => {
    const initDb = async () => {
      const dbManager = new DatabaseManager();
      await dbManager.init();
      setDb(dbManager);
      loadProducts(dbManager);
      
      // Carica configurazioni salvate
      await loadSavedConfigs(dbManager);
    };
    
    initDb();
  }, []);

  // Carica configurazioni salvate da IndexedDB
  const loadSavedConfigs = async (dbManager) => {
    try {
      // Carica galvaniche salvate
      const savedGalvaniche = await dbManager.loadConfig('galvaniche');
      if (savedGalvaniche) {
        setGalvaniche(savedGalvaniche);
        console.log('Galvaniche caricate da DB');
      }
      
      // Carica finiture salvate
      const savedFiniture = await dbManager.loadConfig('finiture');
      if (savedFiniture) {
        setFinitureState(savedFiniture);
        console.log('Finiture caricate da DB');
      }
    } catch (error) {
      console.error('Errore nel caricare configurazioni:', error);
    }
  };

  // Carica prodotti dal database
  const loadProducts = async (dbManager) => {
    try {
      const productsResult = await dbManager.getAllProducts(listino);
      setProducts(Array.isArray(productsResult) ? productsResult : []);
    } catch (error) {
      console.error('Errore nel caricamento prodotti:', error);
      setProducts([]);
    }
  };

  // Monitor stato connessione
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ricarica prodotti quando cambia listino
  useEffect(() => {
    if (db) {
      loadProducts(db);
      // Reset completo quando cambia listino
      resetForm();
    }
  }, [listino, db]);

  // Funzioni per gestione costi
  const getCostoGalvanica = () => {
    const galvanica = coloriGalvanica.find(g => g.value === coloreGalvanica);
    return galvanica ? galvanica.cost : 0;
  };

  const getCostoFinitura = () => {
    const fin = finiture.find(f => f.value === finitura);
    return fin ? fin.cost : 0;
  };

  // Ricerca codice nel database
  const ricercaCodice = async (codiceCerca) => {
    if (!codiceCerca || !db) return;
    
    // Reset automatico quando cambia il codice
    setLunghezzaBracciale('');
    setLunghezzaInch('');
    setNumeroPezzi('');
    setGrammiPezzi('');
    setQuantitaMetraggio('');
    setColoreGalvanica('');
    setFinitura('');
    setPesoCm(0);
    setTotalePesoBracciale(0);
    setCostoGrammo(0);
    setCostoGrammoMetraggio(0);
    setTotaleCostoBracciale(0);
    setCostoMetraggio(0);
    setMetri1kg(0);
    setPezziKg(0);
    setTotaleGrammiPezzi(0);
    setPezziGrammi(0);
    
    let codiceFormattato = codiceCerca.toUpperCase();
    if (!codiceFormattato.startsWith('M/')) {
      codiceFormattato = 'M/' + codiceFormattato;
    }

    try {
      const risultato = await db.getProduct(listino, codiceFormattato);
      
      if (risultato) {
        setGrammiMetro(risultato.grammiMetro.toString());
        setManifatturaMetraggio(risultato.manifatturaMetraggio.toString());
        setGrammi40cm(risultato.grammi40cm.toString());
        setManifatturaFinito(risultato.manifatturaFinito.toString());
      } else {
        // Pulisci i campi se non trovato
        setGrammiMetro('');
        setManifatturaMetraggio('');
        setGrammi40cm('');
        setManifatturaFinito('');
      }
    } catch (error) {
      console.error('Errore nella ricerca:', error);
    }
  };

  // Calcola peso per cm
  useEffect(() => {
    if (grammiMetro) {
      setPesoCm(parseFloat(grammiMetro) / 100);
    }
  }, [grammiMetro]);

  // Calcola peso totale bracciale
  useEffect(() => {
    if (lunghezzaBracciale && grammi40cm && pesoCm) {
      const lunghezza = parseFloat(lunghezzaBracciale);
      const grammi40 = parseFloat(grammi40cm);
      let risultato;

      if (lunghezza > 40) {
        risultato = (lunghezza - 40) * pesoCm + grammi40;
      } else if (lunghezza < 40) {
        risultato = grammi40 - (40 - lunghezza) * pesoCm;
      } else {
        risultato = grammi40;
      }

      setTotalePesoBracciale(risultato);
      if (risultato > 0) {
        setPezziKg(Math.round(1000 / risultato));
      }
    }
  }, [lunghezzaBracciale, grammi40cm, pesoCm]);

  // Calcola costi
  useEffect(() => {
    const quotazione = parseFloat(quotazioneMetallo) || 0;
    const costoGalv = getCostoGalvanica();
    const costoFin = getCostoFinitura();
    const manifFinito = parseFloat(manifatturaFinito) || 0;
    const manifMetraggio = parseFloat(manifatturaMetraggio) || 0;

    // Costo grammo prodotto finito
    let costoGr = manifFinito + quotazione + costoGalv + costoFin;
    if (coloreGalvanica === 'Argentatura') {
      costoGr -= 0.008;
    }
    setCostoGrammo(costoGr);

    // Costo grammo metraggio
    setCostoGrammoMetraggio(manifMetraggio + quotazione + costoGalv);

    // Costo totale bracciale
    if (totalePesoBracciale > 0) {
      setTotaleCostoBracciale(costoGr * totalePesoBracciale);
    }
  }, [manifatturaFinito, manifatturaMetraggio, quotazioneMetallo, coloreGalvanica, finitura, totalePesoBracciale]);

  // Calcola metraggio
  useEffect(() => {
    if (quantitaMetraggio && costoGrammoMetraggio) {
      setCostoMetraggio(parseFloat(quantitaMetraggio) * costoGrammoMetraggio);
    }
    
    if (quantitaMetraggio && grammiMetro) {
      setMetri1kg(parseFloat(quantitaMetraggio) / parseFloat(grammiMetro));
    }
  }, [quantitaMetraggio, costoGrammoMetraggio, grammiMetro]);

  // Calcola totali pezzi
  useEffect(() => {
    if (numeroPezzi && totalePesoBracciale) {
      setTotaleGrammiPezzi(parseFloat(numeroPezzi) * totalePesoBracciale);
    }
  }, [numeroPezzi, totalePesoBracciale]);

  useEffect(() => {
    if (grammiPezzi && totalePesoBracciale > 0) {
      setPezziGrammi(Math.round(parseFloat(grammiPezzi) / totalePesoBracciale));
    }
  }, [grammiPezzi, totalePesoBracciale]);

  // Conversione pollici - aggiornata per essere bidirezionale
  const handleLunghezzaCmChange = (value) => {
    setLunghezzaBracciale(value);
    if (value && !isNaN(value)) {
      const pollici = parseFloat(value) / 2.54;
      setLunghezzaInch(pollici.toFixed(2));
    } else {
      setLunghezzaInch('');
    }
  };

  const handleLunghezzaInchChange = (value) => {
    setLunghezzaInch(value);
    if (value && !isNaN(value)) {
      const cm = parseFloat(value) * 2.54;
      setLunghezzaBracciale(cm.toFixed(2));
    } else {
      setLunghezzaBracciale('');
    }
  };

  // Conversione bidirezionale Numero Pezzi <-> Grammi Totali
  const handleNumeroPezziChange = (value) => {
    setNumeroPezzi(value);
    if (value && !isNaN(value) && totalePesoBracciale > 0) {
      const grammiTotali = parseFloat(value) * totalePesoBracciale;
      setGrammiPezzi(grammiTotali.toFixed(2));
    } else {
      setGrammiPezzi('');
    }
  };

  const handleGrammiPezziChange = (value) => {
    setGrammiPezzi(value);
    if (value && !isNaN(value) && totalePesoBracciale > 0) {
      const numeroPezzi = parseFloat(value) / totalePesoBracciale;
      setNumeroPezzi(Math.round(numeroPezzi).toString());
    } else {
      setNumeroPezzi('');
    }
  };

  // Reset form
  const resetForm = () => {
    setCodice('');
    setGrammiMetro('');
    setManifatturaMetraggio('');
    setGrammi40cm('');
    setManifatturaFinito('');
    setLunghezzaBracciale('');
    setLunghezzaInch('');
    setColoreGalvanica('');
    setFinitura('');
    setQuantitaMetraggio('');
    setNumeroPezzi('');
    setGrammiPezzi('');
    setQuotazioneMetallo('1.30');
    // Reset valori calcolati
    setPesoCm(0);
    setTotalePesoBracciale(0);
    setCostoGrammo(0);
    setCostoGrammoMetraggio(0);
    setTotaleCostoBracciale(0);
    setCostoMetraggio(0);
    setMetri1kg(0);
    setPezziKg(0);
    setTotaleGrammiPezzi(0);
    setPezziGrammi(0);
  };

  // Gestione galvaniche
  const handleUpdateGalvanica = async (index, newCost) => {
    const updatedGalvaniche = [...galvaniche];
    updatedGalvaniche[index].cost = parseFloat(newCost) || 0;
    setGalvaniche(updatedGalvaniche);
    setEditingGalvanica(null);
    
    // Salva in IndexedDB
    if (db) {
      await db.saveConfig('galvaniche', updatedGalvaniche);
      console.log('Galvaniche salvate in DB');
    }
  };

 const handleResetGalvaniche = async () => {
    if (confirm('Ripristinare i costi di default per tutte le galvaniche?')) {
      const defaultGalvaniche = [
        { value: '', label: 'Nessuna', cost: 0 },
        { value: 'Argentatura', label: 'Argentatura', cost: 0.008 },
        { value: 'Brunito', label: 'Brunito', cost: 0.016 },
        { value: 'Dorato Flash', label: 'Dorato Flash', cost: 0.38 },
        { value: 'Dorato 1/2MC', label: 'Dorato 1/2MC', cost: 0.64 },
        { value: 'Dorato 1MC', label: 'Dorato 1MC', cost: 1.05 },
        { value: 'Ossidato', label: 'Ossidato', cost: 0.036 },
        { value: 'Platino', label: 'Platino', cost: 0.33 },
        { value: 'Rodio', label: 'Rodio', cost: 0.29 },
        { value: 'Rutenio', label: 'Rutenio', cost: 0.31 }
      ];
      setGalvaniche(defaultGalvaniche);
      
      // Salva in IndexedDB
      if (db) {
        await db.saveConfig('galvaniche', defaultGalvaniche);
        console.log('Galvaniche ripristinate e salvate in DB');
      }
    }
  };


  // Gestione finiture
  const handleUpdateFinitura = async (index, newCost) => {
    const updatedFiniture = [...finitureState];
    updatedFiniture[index].cost = parseFloat(newCost) || 0;
    setFinitureState(updatedFiniture);
    setEditingFinitura(null);
    
    // Salva in IndexedDB
    if (db) {
      await db.saveConfig('finiture', updatedFiniture);
      console.log('Finiture salvate in DB');
    }
  };
 const handleResetFiniture = async () => {
    if (confirm('Ripristinare i costi di default per tutte le finiture?')) {
      const defaultFiniture = [
        { value: '', label: 'Nessuna', cost: 0 },
        { value: 'Antitarnish', label: 'Antitarnish', cost: 0.008 },
        { value: 'Antitarnish Agere', label: 'Antitarnish Agere', cost: 0.055 },
        { value: 'E-Coating', label: 'E-Coating', cost: 0.030 },
        { value: 'Rocchetti', label: 'Rocchetti', cost: 0.006 }
      ];
      setFinitureState(defaultFiniture);
      
      // Salva in IndexedDB
      if (db) {
        await db.saveConfig('finiture', defaultFiniture);
        console.log('Finiture ripristinate e salvate in DB');
      }
    }
  };

  // Gestione prodotti
  const handleSaveProduct = async (productData) => {
    if (!db) return;
    
    try {
      await db.addProduct(listino, productData);
      await loadProducts(db);
      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Errore nel salvare il prodotto:', error);
    }
  };

  const handleDeleteProduct = async (codice) => {
    if (!db || !confirm('Sei sicuro di voler eliminare questo prodotto?')) return;
    
    try {
      await db.deleteProduct(listino, codice);
      await loadProducts(db);
    } catch (error) {
      console.error('Errore nell\'eliminare il prodotto:', error);
    }
  };

  // Export/Import dati Excel
  const handleExportExcel = async () => {
    if (!db) return;
    
    try {
      const data = await db.exportData();
      
      // Prepara i dati per l'export
      let csvContent = '';
      
      // Foglio BaseB3
      csvContent += '=== BASE B3 ===\n';
      csvContent += 'Codice,Grammi/Metro,Manifattura Metraggio,Grammi 40cm,Manifattura Finito\n';
      data.baseB3.forEach(item => {
        csvContent += `${item.codice},${item.grammiMetro},${item.manifatturaMetraggio},${item.grammi40cm},${item.manifatturaFinito}\n`;
      });
      
      csvContent += '\n=== BASE B4 ===\n';
      csvContent += 'Codice,Grammi/Metro,Manifattura Metraggio,Grammi 40cm,Manifattura Finito\n';
      data.baseB4.forEach(item => {
        csvContent += `${item.codice},${item.grammiMetro},${item.manifatturaMetraggio},${item.grammi40cm},${item.manifatturaFinito}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database_gioielleria.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Database esportato con successo in formato CSV!');
    } catch (error) {
      console.error('Errore nell\'export:', error);
      alert('Errore nell\'esportazione del database');
    }
  };

  const handleImportExcel = async (event) => {
    if (!db) return;
    
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      console.log('File letto, lunghezza:', text.length);
      
      const sections = text.split(/===\s*(BASE B3|BASE B4)\s*===/i);
      console.log('Sezioni trovate:', sections.length);
      
      const importData = { baseB3: [], baseB4: [] };
      
      for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i].trim().toUpperCase();
        const sectionContent = sections[i + 1];
        
        console.log('Elaboro sezione:', sectionName);
        
        if (!sectionContent) continue;
        
        const lines = sectionContent.split('\n').filter(line => line.trim() && !line.startsWith('==='));
        console.log('Righe trovate per', sectionName, ':', lines.length);
        
        if (lines.length < 2) continue;
        
        // Salta la riga header
        for (let j = 1; j < lines.length; j++) {
          const values = lines[j].split(/[,;]/).map(v => v.trim());
          
          if (!values[0]) continue; // Salta righe vuote
          
          if (sectionName.includes('B3')) {
            const item = {
              codice: values[0].toUpperCase().startsWith('M/') ? values[0].toUpperCase() : 'M/' + values[0].toUpperCase(),
              grammiMetro: parseFloat(values[1].replace(',', '.')) || 0,
              manifatturaMetraggio: parseFloat(values[2].replace(',', '.')) || 0,
              grammi40cm: parseFloat(values[3].replace(',', '.')) || 0,
              manifatturaFinito: parseFloat(values[4].replace(',', '.')) || 0
            };
            importData.baseB3.push(item);
            console.log('Aggiunto a BaseB3:', item.codice);
          } else if (sectionName.includes('B4')) {
            const item = {
              codice: values[0].toUpperCase().startsWith('M/') ? values[0].toUpperCase() : 'M/' + values[0].toUpperCase(),
              grammiMetro: parseFloat(values[1].replace(',', '.')) || 0,
              manifatturaMetraggio: parseFloat(values[2].replace(',', '.')) || 0,
              grammi40cm: parseFloat(values[3].replace(',', '.')) || 0,
              manifatturaFinito: parseFloat(values[4].replace(',', '.')) || 0
            };
            importData.baseB4.push(item);
            console.log('Aggiunto a BaseB4:', item.codice);
          }
        }
      }
      
      console.log('Dati da importare:', importData);
      
      // Importa solo se c'è almeno un dato
      if (importData.baseB3.length > 0 || importData.baseB4.length > 0) {
        await db.importData(importData);
        
        // Ricarica i prodotti in modo forzato
        const newProducts = await db.getAllProducts(listino);
        setProducts(Array.isArray(newProducts) ? newProducts : []);
        
        alert(`✅ Database importato con successo!\n\n📊 Statistiche:\n• BaseB3: ${importData.baseB3.length} prodotti\n• BaseB4: ${importData.baseB4.length} prodotti\n\nAggiorna la pagina se non vedi i dati.`);
        
        // Forza aggiornamento interfaccia
        setCurrentTab('calculator');
        setTimeout(() => setCurrentTab('database'), 100);
      } else {
        alert('❌ Nessun dato trovato nel file.\n\nVerifica che:\n• Il file contenga le sezioni === BASE B3 === e/o === BASE B4 ===\n• Ci siano dati sotto ogni sezione\n• Il formato sia corretto (CSV con virgole)');
      }
    } catch (error) {
      console.error('Errore nell\'import:', error);
      alert('❌ Errore nell\'importazione:\n' + error.message + '\n\nApri la console del browser (F12) per più dettagli.');
    }
    event.target.value = '';
  };

  const handleDownloadTemplate = () => {
    try {
      const template = `=== BASE B3 ===
Codice,Grammi/Metro,Manifattura Metraggio,Grammi 40cm,Manifattura Finito
M/001,12.5,2.50,5.0,3.20
M/002,15.0,3.00,6.0,3.80
M/003,8.2,2.10,3.28,2.90

=== BASE B4 ===
Codice,Grammi/Metro,Manifattura Metraggio,Grammi 40cm,Manifattura Finito
M/001,12.8,2.80,5.12,3.50
M/002,15.3,3.20,6.12,4.00
M/004,10.5,2.40,4.2,3.10`;
      
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_database.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Template scaricato! Apri il file con Excel, modifica i dati e salvalo come CSV.');
    } catch (error) {
      console.error('Errore nel download template:', error);
      alert('Impossibile scaricare il template.');
    }
  };

  // Form per prodotti
  const ProductForm = ({ product, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      codice: product?.codice || '',
      grammiMetro: product?.grammiMetro || '',
      manifatturaMetraggio: product?.manifatturaMetraggio || '',
      grammi40cm: product?.grammi40cm || '',
      manifatturaFinito: product?.manifatturaFinito || ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      
      // Assicura che il codice abbia il prefisso M/
      let codice = formData.codice.toUpperCase();
      if (!codice.startsWith('M/')) {
        codice = 'M/' + codice;
      }
      
      onSave({
        ...formData,
        codice,
        grammiMetro: parseFloat(formData.grammiMetro),
        manifatturaMetraggio: parseFloat(formData.manifatturaMetraggio),
        grammi40cm: parseFloat(formData.grammi40cm),
        manifatturaFinito: parseFloat(formData.manifatturaFinito)
      });
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">
            {product ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Codice</label>
              <input
                type="text"
                value={formData.codice}
                onChange={(e) => setFormData({...formData, codice: e.target.value})}
                placeholder="es. 001"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Grammi/Metro</label>
              <input
                type="number"
                step="0.01"
                value={formData.grammiMetro}
                onChange={(e) => setFormData({...formData, grammiMetro: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Manifattura Metraggio</label>
              <input
                type="number"
                step="0.01"
                value={formData.manifatturaMetraggio}
                onChange={(e) => setFormData({...formData, manifatturaMetraggio: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Grammi 40cm</label>
              <input
                type="number"
                step="0.01"
                value={formData.grammi40cm}
                onChange={(e) => setFormData({...formData, grammi40cm: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Manifattura Finito</label>
              <input
                type="number"
                step="0.01"
                value={formData.manifatturaFinito}
                onChange={(e) => setFormData({...formData, manifatturaFinito: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Salva
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Tab Navigation
  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={() => {
        // Se si clicca su Lavorazioni e non è sbloccato, chiedi password
        if (id === 'lavorazioni' && !isLavorazioniUnlocked) {
          const password = prompt('Inserisci la password per accedere alle Lavorazioni:');
          if (password === LAVORAZIONI_PASSWORD) {
            setIsLavorazioniUnlocked(true);
            onClick(id);
          } else if (password !== null) {
            alert('❌ Password errata!');
          }
        } else {
          onClick(id);
        }
      }}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
        isActive
          ? 'bg-white/20 text-white border-2 border-white/30'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Calcolatore Croma Catene</h1>
                <div className="flex items-center gap-2 text-white/70">
                  {isOnline ? (
                    <><Wifi className="w-4 h-4" /> Online</>
                  ) : (
                    <><WifiOff className="w-4 h-4" /> Offline</>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {currentTab === 'database' && (
                <button
                  onClick={() => setCurrentTab('calculator')}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
                  title="Torna al Calcolatore"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>
              )}
              {currentTab === 'calculator' && (
                <button
                  onClick={resetForm}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
                  title="Reset"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-2">
            <TabButton
              id="calculator"
              label="Calcolatore"
              icon={Calculator}
              isActive={currentTab === 'calculator'}
              onClick={setCurrentTab}
            />
            <TabButton
              id="lavorazioni"
              label="Lavorazioni"
              icon={Settings}
              isActive={currentTab === 'lavorazioni'}
              onClick={setCurrentTab}
            />
            <TabButton
              id="database"
              label="Database"
              icon={Database}
              isActive={currentTab === 'database'}
              onClick={setCurrentTab}
            />
          </div>
        </div>

        {/* Calculator Tab */}
        {currentTab === 'calculator' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Colonna Sinistra - Input */}
            <div className="space-y-6">
              {/* Ricerca Codice */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Ricerca Prodotto
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Codice</label>
                    <input
                      type="text"
                      value={codice}
                      onChange={(e) => {
                        setCodice(e.target.value);
                        ricercaCodice(e.target.value);
                      }}
                      placeholder="es. 001"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Listino</label>
                    <select
                      value={listino}
                      onChange={(e) => setListino(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="Base B3" style={{color: 'black', backgroundColor: 'white'}}>Base B3</option>
                      <option value="Base B4" style={{color: 'black', backgroundColor: 'white'}}>Base B4</option>
                    </select>
                  </div>
                </div>

                {/* Dati Prodotto */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Grammi/Metro</label>
                    <input
                      type="number"
                      value={grammiMetro}
                      onChange={(e) => setGrammiMetro(e.target.value)}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-yellow-300 font-semibold cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Costo Metraggio</label>
                    <input
                      type="number"
                      value={manifatturaMetraggio}
                      onChange={(e) => setManifatturaMetraggio(e.target.value)}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-yellow-300 font-semibold cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Grammi 40cm</label>
                    <input
                      type="number"
                      value={grammi40cm}
                      onChange={(e) => setGrammi40cm(e.target.value)}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-yellow-300 font-semibold cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Costo Finito</label>
                    <input
                      type="number"
                      value={manifatturaFinito}
                      onChange={(e) => setManifatturaFinito(e.target.value)}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-yellow-300 font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Lavorazioni */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Lavorazioni</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Colore Galvanica</label>
                      <select
                        value={coloreGalvanica}
                        onChange={(e) => setColoreGalvanica(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {coloriGalvanica.map(colore => (
                          <option key={colore.value} value={colore.value} style={{color: 'black', backgroundColor: 'white'}}>{colore.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Costo (€/g)</label>
                      <input
                        type="number"
                        value={getCostoGalvanica().toFixed(3)}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-yellow-300 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Finitura</label>
                      <select
                        value={finitura}
                        onChange={(e) => setFinitura(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {finiture.map(fin => (
                          <option key={fin.value} value={fin.value} style={{color: 'black', backgroundColor: 'white'}}>{fin.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Costo (€/g)</label>
                      <input
                        type="number"
                        value={getCostoFinitura().toFixed(3)}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-yellow-300 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Misure e Risultati Bracciale */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Calcolo Prodotto Finito</h2>
                
                <div className="space-y-4">
                  {/* Input Lunghezze */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Lunghezza (cm)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={lunghezzaBracciale}
                        onChange={(e) => handleLunghezzaCmChange(e.target.value)}
                        placeholder="40.00"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Lunghezza (pollici)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={lunghezzaInch}
                        onChange={(e) => handleLunghezzaInchChange(e.target.value)}
                        placeholder="15.75"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Risultati Peso */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                      <span className="text-white/80 text-sm">Peso al Pezzo:</span>
                      <span className="text-white font-semibold">{totalePesoBracciale.toFixed(2)} g</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                      <span className="text-white/80 text-sm">Peso/cm:</span>
                      <span className="text-white font-semibold">{pesoCm.toFixed(3)} g</span>
                    </div>
                  </div>

                  {/* Costo Totale Evidenziato */}
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-xl border border-yellow-500/30">
                    <span className="text-yellow-100 font-medium">Costo Totale al Pezzo:</span>
                    <span className="text-yellow-100 font-bold text-xl">€ {totaleCostoBracciale.toFixed(2)}</span>
                  </div>

                  {/* Input Pezzi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Numero Pezzi</label>
                      <input
                        type="number"
                        value={numeroPezzi}
                        onChange={(e) => handleNumeroPezziChange(e.target.value)}
                        placeholder="1"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Grammi Totali</label>
                      <input
                        type="number"
                        step="0.01"
                        value={grammiPezzi}
                        onChange={(e) => handleGrammiPezziChange(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Pezzi per Kg */}
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-white/80">Pezzi/Kg:</span>
                    <span className="text-white font-semibold">{pezziKg}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonna Destra - Risultati */}
            <div className="space-y-6">
              {/* Risultati Metraggio */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Metraggio</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Quantità (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={quantitaMetraggio}
                      onChange={(e) => setQuantitaMetraggio(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-white/80">Costo Metraggio:</span>
                    <span className="text-white font-semibold">€ {costoMetraggio.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-white/80">Metri da Grammi:</span>
                    <span className="text-white font-semibold">{metri1kg.toFixed(1)} m</span>
                  </div>
                </div>
              </div>

              {/* Risultati Costi */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Costi Unitari</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-white/80">Costo/Grammo Finito:</span>
                    <span className="text-white font-semibold">€ {costoGrammo.toFixed(3)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-white/80">Costo/Grammo Metraggio:</span>
                    <span className="text-white font-semibold">€ {costoGrammoMetraggio.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Tab */}
        {currentTab === 'database' && (
          <div className="space-y-6">
            {/* Controlli Database */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Gestione Database</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Template</span>
                  </button>
                  
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Esporta</span>
                  </button>
                  
                  <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer text-sm">
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Importa</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleImportExcel}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nuovo</span>
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mb-4">
                <h3 className="text-blue-100 font-semibold mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Come usare l'import/export
                </h3>
                <div className="text-blue-100/80 text-sm space-y-2">
                  <p><strong>📥 IMPORTARE:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>1. Scarica il Template</li>
                    <li>2. Apri con Excel e modifica i dati</li>
                    <li>3. Salva come CSV (UTF-8)</li>
                    <li>4. Clicca Importa e seleziona il file</li>
                  </ul>
                  <p className="mt-2"><strong>📤 ESPORTARE:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Clicca Esporta per salvare tutto il database</li>
                    <li>• Il file può essere riaperto con Excel</li>
                    <li>• Usa per backup o per trasferire su altro dispositivo</li>
                  </ul>
                  <p className="mt-2 text-yellow-200">💡 <strong>Tip:</strong> Il file contiene 2 sezioni (BaseB3 e BaseB4). Non modificare le righe === NOME ===</p>
                </div>
              </div>

              <div className="text-white/70 text-sm">
                <p>Listino corrente: <span className="text-white font-semibold">{listino}</span></p>
                <p>Prodotti nel database: <span className="text-white font-semibold">{products.length}</span></p>
              </div>
            </div>

            {/* Lista Prodotti */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Prodotti in {listino}</h3>
              
              {products.length === 0 ? (
                <p className="text-white/70 text-center py-8">Nessun prodotto trovato. Aggiungi il primo prodotto!</p>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.codice}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-lg mb-2">{product.codice}</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-white/60">Grammi/Metro:</span>
                              <span className="text-white ml-2">{product.grammiMetro}</span>
                            </div>
                            <div>
                              <span className="text-white/60">Grammi 40cm:</span>
                              <span className="text-white ml-2">{product.grammi40cm}</span>
                            </div>
                            <div>
                              <span className="text-white/60">Manif. Metraggio:</span>
                              <span className="text-white ml-2">€ {product.manifatturaMetraggio}</span>
                            </div>
                            <div>
                              <span className="text-white/60">Manif. Finito:</span>
                              <span className="text-white ml-2">€ {product.manifatturaFinito}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductForm(true);
                            }}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.codice)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lavorazioni Tab */}
        {currentTab === 'lavorazioni' && (
          <div className="space-y-6">
            {/* Quotazione Metallo */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Quotazione Metallo
              </h2>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Prezzo al grammo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={quotazioneMetallo}
                  onChange={(e) => setQuotazioneMetallo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Gestione Galvaniche */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Galvaniche
                </h2>
                <button
                  onClick={handleResetGalvaniche}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Ripristina Default
                </button>
              </div>

              <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mb-6">
                <p className="text-blue-100/80 text-sm">
                  💡 <strong>Modifica i costi delle galvaniche.</strong> Clicca sull'icona di modifica per cambiare il prezzo. Le modifiche si applicano immediatamente ai calcoli.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {galvaniche.map((galvanica, index) => (
                  <div
                    key={galvanica.value}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold">{galvanica.label}</h3>
                      {galvanica.value !== '' && (
                        <button
                          onClick={() => setEditingGalvanica(index)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Modifica costo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {editingGalvanica === index ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.001"
                          defaultValue={galvanica.cost}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateGalvanica(index, e.target.value);
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            const input = e.target.parentElement.querySelector('input');
                            handleUpdateGalvanica(index, input.value);
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingGalvanica(null)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-yellow-400">
                        € {galvanica.cost.toFixed(3)}
                      </div>
                    )}
                    
                    {galvanica.value !== '' && (
                      <div className="text-white/50 text-xs mt-2">
                        per grammo
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gestione Finiture */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Finiture
                </h2>
                <button
                  onClick={handleResetFiniture}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Ripristina Default
                </button>
              </div>

              <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mb-6">
                <p className="text-blue-100/80 text-sm">
                  💡 <strong>Modifica i costi delle finiture.</strong> Clicca sull'icona di modifica per cambiare il prezzo. Le modifiche si applicano immediatamente ai calcoli.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finitureState.map((finitura, index) => (
                  <div
                    key={finitura.value}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold">{finitura.label}</h3>
                      {finitura.value !== '' && (
                        <button
                          onClick={() => setEditingFinitura(index)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Modifica costo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {editingFinitura === index ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.001"
                          defaultValue={finitura.cost}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateFinitura(index, e.target.value);
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            const input = e.target.parentElement.querySelector('input');
                            handleUpdateFinitura(index, input.value);
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingFinitura(null)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-yellow-400">
                        € {finitura.cost.toFixed(3)}
                      </div>
                    )}
                    
                    {finitura.value !== '' && (
                      <div className="text-white/50 text-xs mt-2">
                        per grammo
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form modale per aggiungere/modificare prodotti */}
        {showProductForm && (
          <ProductForm
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setShowProductForm(false);
              setEditingProduct(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

ReactDOM.render(<JewelryCalculator />, document.getElementById('root'));
