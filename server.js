const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path'); // ADDED: For robust static file serving

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Performance Middleware (Enhanced)
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for dev
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ PERFECT STATIC SERVING (Most Important Fix)
app.use(express.static(path.join(__dirname, 'public'))); 

// Catch-all for SPA routing (serves index.html for all non-API routes)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Loan Eligibility Criteria (Exact match to your frontend)
const CRITERIA = {
  salaried: {
    age: { min: 21, max: 60 },
    income: 25000,
    cibil: 700,
    empYears: 2,
    dti: 40,
    instantCibil: 750
  },
  'self-employed': {
    age: { min: 24, max: 65 },
    income: 40000,
    cibil: 720,
    empYears: 3,
    dti: 50,
    instantCibil: 750
  }
};

// API Routes
app.get('/api/criteria', (req, res) => {
  res.json(CRITERIA);
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.post('/api/check-eligibility', (req, res) => {
  try {
    const { applicantType, age, monthlyIncome, cibilScore, totalEmi, employmentYears } = req.body;
    
    // Enhanced validation
    if (!applicantType || !age || !monthlyIncome || !cibilScore || !employmentYears) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!CRITERIA[applicantType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid applicant type. Choose: salaried or self-employed'
      });
    }

    const criteria = CRITERIA[applicantType];
    const dti = monthlyIncome > 0 ? (totalEmi / monthlyIncome) * 100 : 100;

    const checks = {
      age: age >= criteria.age.min && age <= criteria.age.max,
      income: monthlyIncome >= criteria.income,
      cibil: cibilScore >= criteria.cibil,
      employment: employmentYears >= criteria.empYears,
      dti: dti <= criteria.dti
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    const isEligible = passedCount === 5;
    const score = Math.round((passedCount / 5) * 100);

    res.json({
      success: true,
      isEligible,
      score,
      passedCount,
      totalParams: 5,
      checks,
      instantApproval: cibilScore >= criteria.instantCibil,
      dti: dti.toFixed(2),
      message: isEligible ? 
        '✅ YOU ARE ELIGIBLE for loan approval!' : 
        `⚠️ Improve ${5 - passedCount} parameter${5 - passedCount > 1 ? 's' : ''}`,
      eligibleLoans: isEligible ? [
        '🏦 Personal Loan (up to ₹20 Lakh)',
        '🏠 Home Loan (80% financing)',
        '📚 Education Loan',
        '💼 Business Loan'
      ] : []
    });
  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing request'
    });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Loan Approval API running on http://localhost:${PORT}`);
  console.log(`📊 Criteria endpoint: http://localhost:${PORT}/api/criteria`);
  console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
});
