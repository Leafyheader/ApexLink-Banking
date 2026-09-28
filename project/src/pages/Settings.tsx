import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Landmark, Percent, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { settingsApi, handleApiError, type SystemSettings, type TreasurySummary } from '../lib/api';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [withdrawalFeeInput, setWithdrawalFeeInput] = useState('');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [isSavingRate, setIsSavingRate] = useState(false);

  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDescription, setFundDescription] = useState('');
  const [isFunding, setIsFunding] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [settingsData, treasuryData] = await Promise.all([
        settingsApi.get(),
        settingsApi.getTreasury()
      ]);
      setSettings(settingsData);
      setWithdrawalFeeInput(settingsData.withdrawalFee.toString());
      setInterestRateInput(settingsData.defaultLoanInterestRate.toString());
      setTreasury(treasuryData);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleSaveFee = async () => {
    const fee = parseFloat(withdrawalFeeInput);
    if (isNaN(fee) || fee < 0) {
      setError('Withdrawal fee must be a non-negative number');
      return;
    }
    try {
      setIsSavingFee(true);
      setError('');
      const result = await settingsApi.update({ withdrawalFee: fee });
      setSettings(result.updated);
      showSuccess('Withdrawal fee updated');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleSaveRate = async () => {
    const rate = parseFloat(interestRateInput);
    if (isNaN(rate) || rate < 0) {
      setError('Default interest rate must be a non-negative number');
      return;
    }
    try {
      setIsSavingRate(true);
      setError('');
      const result = await settingsApi.update({ defaultLoanInterestRate: rate });
      setSettings(result.updated);
      showSuccess('Default loan interest rate updated');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleFundTreasury = async () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Funding amount must be a positive number');
      return;
    }
    try {
      setIsFunding(true);
      setError('');
      await settingsApi.fundTreasury(amount, fundDescription || undefined);
      const treasuryData = await settingsApi.getTreasury();
      setTreasury(treasuryData);
      setShowFundModal(false);
      setFundAmount('');
      setFundDescription('');
      showSuccess('Treasury account funded successfully');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsFunding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-light-text dark:text-dark-text">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          System-wide configuration. Changes here affect all users.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {successMessage && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-300 text-sm">{successMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Fees */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle>Transaction Fees</CardTitle>
          </div>
          <CardDescription>
            The fee charged on every withdrawal. Applies to all new withdrawals as soon as it's saved;
            already-completed withdrawals are unaffected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 max-w-sm">
            <Input
              label="Withdrawal fee (GH₵)"
              type="number"
              min="0"
              step="0.01"
              value={withdrawalFeeInput}
              onChange={(e) => setWithdrawalFeeInput(e.target.value)}
              fullWidth
            />
            <Button onClick={handleSaveFee} isLoading={isSavingFee}>
              Save
            </Button>
          </div>
          {settings?.updatedBy && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Last updated by {settings.updatedBy} on {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loan Defaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Percent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle>Loan Defaults</CardTitle>
          </div>
          <CardDescription>
            The interest rate pre-filled when a teller creates a new loan. It can still be overridden
            per loan, and does not change the rate on existing loans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 max-w-sm">
            <Input
              label="Default interest rate (% per annum)"
              type="number"
              min="0"
              step="0.01"
              value={interestRateInput}
              onChange={(e) => setInterestRateInput(e.target.value)}
              fullWidth
            />
            <Button onClick={handleSaveRate} isLoading={isSavingRate}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Treasury Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle>Treasury Account</CardTitle>
          </div>
          <CardDescription>
            The bank's operating account. Approved expenses marked "Paid" are debited from this
            account, so it needs to be funded before expenses can be paid out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Account {treasury?.accountNumber}</p>
              <p className="text-2xl font-semibold text-light-text dark:text-dark-text">
                GH₵{(treasury?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Button onClick={() => setShowFundModal(true)}>Fund Treasury Account</Button>
          </div>

          {treasury && treasury.recentTransactions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent activity</h4>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-dark-border rounded-md">
                {treasury.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>
                      <p className="text-gray-800 dark:text-dark-text">{t.description || t.type}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(t.date).toLocaleString()} · {t.reference}
                      </p>
                    </div>
                    <p className={t.type === 'DEPOSIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {t.type === 'DEPOSIT' ? '+' : '-'}GH₵{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        title="Fund Treasury Account"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowFundModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleFundTreasury} isLoading={isFunding}>
              Fund Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Amount (GH₵)"
            type="number"
            min="0.01"
            step="0.01"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            fullWidth
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={fundDescription}
            onChange={(e) => setFundDescription(e.target.value)}
            placeholder="e.g. Monthly operating capital transfer"
            fullWidth
          />
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
