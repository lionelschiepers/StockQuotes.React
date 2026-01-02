import { Portfolio, SecurityPostion, CurrencyHelper } from '../Portfolio';
import axios from 'axios';
import papa from 'papaparse';
import { GetRate } from '../ExchangeRates';
import { YahooFinanceLoader } from '../YahooFinanceLoader';

jest.mock('axios');
jest.mock('papaparse');
jest.mock('../ExchangeRates');
jest.mock('../YahooFinanceLoader');

describe('SecurityPostion', () => {
  let securityPosition;

  beforeEach(() => {
    securityPosition = new SecurityPostion();
    securityPosition.Ticker = 'TEST.TICKER';
    securityPosition.NumberOfShares = 10;
    securityPosition.MarketCost = 100;
    securityPosition.MarketPrice = 120;
    securityPosition.Currency = 'USD';
    securityPosition.RateToEUR = 0.85;
    securityPosition.Security = {
      regularMarketPrice: 12,
      regularMarketPreviousClose: 10,
      trailingAnnualDividendRate: 1
    };
  });

  describe('getTaxeRate', () => {
    it('should return 0.85 * 0.7 for tickers without a dot', () => {
      securityPosition.Ticker = 'TEST';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.85 * 0.7);
    });

    it('should return 0.7 for .BR tickers', () => {
      securityPosition.Ticker = 'TEST.BR';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.7);
    });

    it('should return 0.65 * 0.7 for .VX tickers', () => {
      securityPosition.Ticker = 'TEST.VX';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.65 * 0.7);
    });

    it('should return 0.7 * 0.7 for .ST tickers', () => {
      securityPosition.Ticker = 'TEST.ST';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.7 * 0.7);
    });

    it('should return 0.7362 * 0.7 for .DE tickers', () => {
      securityPosition.Ticker = 'TEST.DE';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.7362 * 0.7);
    });

    it('should return 0.75 * 0.7 for .CA tickers', () => {
      securityPosition.Ticker = 'TEST.CA';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.75 * 0.7);
    });

    it('should return 0.8 * 0.7 for .HE tickers', () => {
      securityPosition.Ticker = 'TEST.HE';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.8 * 0.7);
    });

    it('should return 0.85 * 0.7 for .LU tickers', () => {
      securityPosition.Ticker = 'TEST.LU';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.85 * 0.7);
    });

    it('should return 0.85 * 0.7 for .AS tickers', () => {
      securityPosition.Ticker = 'TEST.AS';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.85 * 0.7);
    });

    it('should return 0.872 * 0.7 for .PA tickers', () => {
      securityPosition.Ticker = 'TEST.PA';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.872 * 0.7);
    });

    it('should return 0.7 for .L tickers', () => {
      securityPosition.Ticker = 'TEST.L';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.7);
    });

    it('should return 0.81 * 0.7 for .MC tickers', () => {
      securityPosition.Ticker = 'TEST.MC';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.81 * 0.7);
    });

    it('should return 0.7 for unknown tickers', () => {
      securityPosition.Ticker = 'UNKNOWN.TICKER';
      expect(securityPosition.getTaxeRate()).toBeCloseTo(0.7);
    });
  });

  describe('getDividendYield', () => {
    it('should return 0 if security is null', () => {
      securityPosition.Security = null;
      expect(securityPosition.getDividendYield()).toBe(0);
    });

    it('should return 0 if dividend rate is NaN', () => {
      securityPosition.Security.trailingAnnualDividendRate = NaN;
      expect(securityPosition.getDividendYield()).toBe(0);
    });

    it('should return correct dividend yield in local currency', () => {
      // (1 * 10) * (0.85 * 0.7)
      expect(securityPosition.getDividendYield()).toBeCloseTo(
        1 * 10 * securityPosition.getTaxeRate()
      );
    });

    it('should return correct dividend yield in EUR', () => {
      // (1 * 10) * (0.85 * 0.7) * 0.85
      expect(securityPosition.getDividendYield(true)).toBeCloseTo(
        1 * 10 * securityPosition.getTaxeRate() * securityPosition.RateToEUR
      );
    });
  });

  describe('getGain', () => {
    it('should return null if MarketPrice is null', () => {
      securityPosition.MarketPrice = null;
      expect(securityPosition.getGain()).toBeNull();
    });

    it('should return null if MarketCost is null', () => {
      securityPosition.MarketCost = null;
      expect(securityPosition.getGain()).toBeNull();
    });

    it('should return null if NumberOfShares is 0', () => {
      securityPosition.NumberOfShares = 0;
      expect(securityPosition.getGain()).toBeNull();
    });

    it('should return correct gain in local currency', () => {
      expect(securityPosition.getGain()).toBeCloseTo(
        securityPosition.MarketPrice - securityPosition.MarketCost
      );
    });

    it('should return correct gain in EUR', () => {
      securityPosition.MarketPriceEUR =
        securityPosition.MarketPrice * securityPosition.RateToEUR;
      securityPosition.MarketCostEUR =
        securityPosition.MarketCost * securityPosition.RateToEUR;
      expect(securityPosition.getGain(true)).toBeCloseTo(
        securityPosition.MarketPriceEUR - securityPosition.MarketCostEUR
      );
    });
  });

  describe('getGainDiff', () => {
    it('should return 0 if MarketPrice is null', () => {
      securityPosition.MarketPrice = null;
      expect(securityPosition.getGainDiff()).toBe(0);
    });

    it('should return 0 if MarketCost is null', () => {
      securityPosition.MarketCost = null;
      expect(securityPosition.getGainDiff()).toBe(0);
    });

    it('should return 0 if NumberOfShares is 0', () => {
      securityPosition.NumberOfShares = 0;
      expect(securityPosition.getGainDiff()).toBe(0);
    });

    it('should return correct gain difference', () => {
      // 100 * (120 / 100) - 100 = 20
      expect(securityPosition.getGainDiff()).toBeCloseTo(
        (100 * securityPosition.MarketPrice) / securityPosition.MarketCost - 100
      );
    });
  });

  describe('getDayGain', () => {
    it('should return 0 if Security is null', () => {
      securityPosition.Security = null;
      expect(securityPosition.getDayGain()).toBe(0);
    });

    it('should return 0 if regularMarketPrice is null', () => {
      securityPosition.Security.regularMarketPrice = null;
      expect(securityPosition.getDayGain()).toBe(0);
    });

    it('should return 0 if regularMarketPreviousClose is null', () => {
      securityPosition.Security.regularMarketPreviousClose = null;
      expect(securityPosition.getDayGain()).toBe(0);
    });

    it('should return correct day gain in local currency', () => {
      // (12 - 10) * 10 = 20
      expect(securityPosition.getDayGain()).toBeCloseTo(
        (securityPosition.Security.regularMarketPrice -
          securityPosition.Security.regularMarketPreviousClose) *
        securityPosition.NumberOfShares
      );
    });

    it('should return correct day gain in EUR', () => {
      // (12 - 10) * 10 * 0.85 = 17
      expect(securityPosition.getDayGain(true)).toBeCloseTo(
        (securityPosition.Security.regularMarketPrice -
          securityPosition.Security.regularMarketPreviousClose) *
        securityPosition.NumberOfShares *
        securityPosition.RateToEUR
      );
    });
  });

  describe('getDayDiff', () => {
    it('should return null if Security is null', () => {
      securityPosition.Security = null;
      expect(securityPosition.getDayDiff()).toBeNull();
    });

    it('should return null if regularMarketPrice is null', () => {
      securityPosition.Security.regularMarketPrice = null;
      expect(securityPosition.getDayDiff()).toBeNull();
    });

    it('should return null if regularMarketPreviousClose is null', () => {
      securityPosition.Security.regularMarketPreviousClose = null;
      expect(securityPosition.getDayDiff()).toBeNull();
    });

    it('should return correct day difference', () => {
      // 100 * (12 / 10 - 1) = 20
      expect(securityPosition.getDayDiff()).toBeCloseTo(
        100 *
        (securityPosition.Security.regularMarketPrice /
          securityPosition.Security.regularMarketPreviousClose -
          1)
      );
    });
  });
});

describe('CurrencyHelper', () => {
  describe('updateCurrency', () => {
    beforeEach(() => {
      GetRate.mockClear();
    });

    it('should set Currency to USD for tickers without a dot', async () => {
      const positions = [{ Ticker: 'TEST', RateToEUR: 1 }];
      GetRate.mockResolvedValueOnce(0.85); // Mock rate for USD to EUR
      await CurrencyHelper.updateCurrency(positions);
      expect(positions[0].Currency).toBe('USD');
      expect(positions[0].RateToEUR).toBe(0.85);
      expect(GetRate).toHaveBeenCalledWith('USD', 'EUR');
    });

    it('should set Currency to CHF for .SW tickers', async () => {
      const positions = [{ Ticker: 'TEST.SW', RateToEUR: 1 }];
      GetRate.mockResolvedValueOnce(1); // Mock rate for CHF to EUR
      await CurrencyHelper.updateCurrency(positions);
      expect(positions[0].Currency).toBe('CHF');
      expect(positions[0].RateToEUR).toBe(1);
      expect(GetRate).toHaveBeenCalledWith('CHF', 'EUR');
    });

    it('should set Currency to GBp for .L tickers', async () => {
      const positions = [{ Ticker: 'TEST.L', RateToEUR: 1 }];
      GetRate.mockResolvedValueOnce(1.15); // Mock rate for GBp to EUR
      await CurrencyHelper.updateCurrency(positions);
      expect(positions[0].Currency).toBe('GBp');
      expect(positions[0].RateToEUR).toBe(1.15);
      expect(GetRate).toHaveBeenCalledWith('GBp', 'EUR');
    });

    it('should set Currency to NOK for .OL tickers', async () => {
      const positions = [{ Ticker: 'TEST.OL', RateToEUR: 1 }];
      GetRate.mockResolvedValueOnce(0.09); // Mock rate for NOK to EUR
      await CurrencyHelper.updateCurrency(positions);
      expect(positions[0].Currency).toBe('NOK');
      expect(positions[0].RateToEUR).toBe(0.09);
      expect(GetRate).toHaveBeenCalledWith('NOK', 'EUR');
    });

    it('should set Currency to EUR for other tickers', async () => {
      const positions = [{ Ticker: 'TEST.DE', RateToEUR: 1 }];
      GetRate.mockResolvedValueOnce(1); // Mock rate for EUR to EUR
      await CurrencyHelper.updateCurrency(positions);
      expect(positions[0].Currency).toBe('EUR');
      expect(positions[0].RateToEUR).toBe(1);
      expect(GetRate).toHaveBeenCalledWith('EUR', 'EUR');
    });

    it('should call GetRate for each position', async () => {
      const positions = [
        { Ticker: 'TEST', RateToEUR: 1 },
        { Ticker: 'TEST.L', RateToEUR: 1 },
      ];
      GetRate.mockResolvedValueOnce(0.85).mockResolvedValueOnce(1.15);
      await CurrencyHelper.updateCurrency(positions);
      expect(GetRate).toHaveBeenCalledTimes(2);
      expect(GetRate).toHaveBeenCalledWith('USD', 'EUR');
      expect(GetRate).toHaveBeenCalledWith('GBp', 'EUR');
    });
  });
});

describe('Portfolio.Load', () => {
  const mockCsvData = `
Ticker,Name,Type,Shares,Price,Commission
MSFT,Microsoft,Buy,10,100,5
GOOG,Alphabet,Buy,5,150,2.5
`;
  const mockParsedCsv = [
    { Symbol: 'MSFT', Name: 'Microsoft', Type: 'Buy', Shares: '10', Price: '100', Commission: '5' },
    { Symbol: 'GOOG', Name: 'Alphabet', Type: 'Buy', Shares: '5', Price: '150', Commission: '2.5' },
  ];
  const mockYahooData = [
    { symbol: 'MSFT', regularMarketPrice: 105, regularMarketPreviousClose: 100, trailingAnnualDividendRate: 1 },
    { symbol: 'GOOG', regularMarketPrice: 155, regularMarketPreviousClose: 150, trailingAnnualDividendRate: 1.5 },
  ];

  let mockYahooFinanceLoaderInstance;

  beforeEach(() => {
    axios.get.mockClear();
    papa.parse.mockClear();
    GetRate.mockClear();
    YahooFinanceLoader.mockClear(); 
    mockYahooFinanceLoaderInstance = {
      Load: jest.fn().mockResolvedValue(mockYahooData),
    };
    YahooFinanceLoader.mockImplementation(() => mockYahooFinanceLoaderInstance);
  });

  it('should load a basic CSV with buy transactions', async () => {
    axios.get.mockResolvedValueOnce({ data: mockCsvData });
    papa.parse.mockReturnValueOnce({ data: mockParsedCsv });
    GetRate.mockResolvedValue(0.85); // Assuming all USD to EUR rate for simplicity

    const portfolio = await Portfolio.Load('http://test.csv');

    expect(axios.get).toHaveBeenCalledWith('http://test.csv');
    expect(papa.parse).toHaveBeenCalledWith(mockCsvData, { header: true });
    expect(GetRate).toHaveBeenCalledTimes(2); // For MSFT and GOOG
    expect(GetRate).toHaveBeenCalledWith('USD', 'EUR');
    expect(YahooFinanceLoader).toHaveBeenCalledTimes(1);
    expect(YahooFinanceLoader).toHaveBeenCalledWith(); // Check if constructor was called
    expect(mockYahooFinanceLoaderInstance.Load).toHaveBeenCalledWith(['MSFT', 'GOOG'], expect.any(Array));

    expect(portfolio.length).toBe(2);

    const msftPosition = portfolio.find(p => p.Ticker === 'MSFT');
    expect(msftPosition.NumberOfShares).toBe(10);
    expect(msftPosition.MarketCost).toBe(10 * 100 + 5); // 1005
    expect(msftPosition.Name).toBe('Microsoft');
    expect(msftPosition.Currency).toBe('USD');
    expect(msftPosition.RateToEUR).toBe(0.85);
    expect(msftPosition.Security).toEqual(mockYahooData[0]);
    expect(msftPosition.MarketPrice).toBe(10 * 105); // 1050
    expect(msftPosition.MarketCostEUR).toBe(1005 * 0.85);
    expect(msftPosition.MarketPriceEUR).toBe(1050 * 0.85);
  });
});


