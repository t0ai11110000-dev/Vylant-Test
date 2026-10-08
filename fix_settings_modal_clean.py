with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find SettingsModal definition and replace its entire body from `}) => {` to `if (mode === 'simple') {`
# Wait, let's locate the exact start and end of `SettingsModal` body.

start_marker = "const SettingsModal = ({"
start_pos = content.find(start_marker)
if start_pos == -1:
    print("SettingsModal not found")
    exit(1)

# Find where `if (mode === 'simple') {` occurs after start_pos
end_marker = "  if (mode === 'simple') {"
end_pos = content.find(end_marker, start_pos)
if end_pos == -1:
    print("End marker not found")
    exit(1)

# Let's construct the clean body of SettingsModal:
clean_body = """}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetIsPublic, setPresetIsPublic] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null);
  const [emailChangeStep, setEmailChangeStep] = useState<'send' | 'verify' | 'new-email'>('send');
  const [emailChangeCode, setEmailChangeCode] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [mobileSettingsView, setMobileSettingsView] = useState<'list' | 'tab'>('list');
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const [showResetFeedback, setShowResetFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const mobileStatusRef = useRef<HTMLDivElement>(null);
  const lastOpenedRef = useRef<boolean>(false);

  const handleSendEmailCode = async () => {
    setIsEmailLoading(true);
    setEmailError(null);
    try {
      const response = await apiFetch('/api/settings/email/send-code', {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        if (data.needsVerification) {
          setEmailChangeStep('verify');
        } else {
          setEmailChangeStep('new-email');
          setTempValue('');
        }
      } else {
        setEmailError(data.error || 'Failed to send code');
      }
    } catch (err) {
      setEmailError('Connection error');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    setIsEmailLoading(true);
    setEmailError(null);
    try {
      const response = await apiFetch('/api/settings/email/verify-code', {
        method: 'POST',
        body: JSON.stringify({ code: emailChangeCode })
      });
      if (response.ok) {
        setEmailChangeStep('new-email');
        setTempValue('');
      } else {
        const data = await response.json();
        setEmailError(data.error || 'Invalid code');
      }
    } catch (err) {
      setEmailError('Connection error');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleFinalEmailUpdate = async () => {
    if (!tempValue.trim().includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setIsEmailLoading(true);
    setEmailError(null);
    try {
      const response = await apiFetch('/api/settings/email/update', {
        method: 'POST',
        body: JSON.stringify({ newEmail: tempValue })
      });
      const data = await response.json();
      if (response.ok) {
        setUserEmail(data.email);
        setEditingField(null);
        setEmailChangeStep('send');
        setEmailChangeCode('');
      } else {
        setEmailError(data.error || 'Update failed');
      }
    } catch (err) {
      setEmailError('Connection error');
    } finally {
      setIsEmailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'presets') {
      fetchPresets();
    }
  }, [activeTab, fetchPresets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideDesktop = statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node);
      const isOutsideMobile = mobileStatusRef.current && !mobileStatusRef.current.contains(event.target as Node);
      if (isOutsideDesktop && isOutsideMobile) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.removeEventListener('mousedown', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && !lastOpenedRef.current) {
      console.log('SettingsModal opening, setting tab to:', initialTab && initialTab !== 'overview' ? initialTab : 'my-account');
      if (initialTab && initialTab !== 'overview') {
        setActiveTab(initialTab);
        setMobileSettingsView('tab');
      } else {
        if (isMobile) {
          setMobileSettingsView('list');
        } else {
          setActiveTab('my-account');
          setMobileSettingsView('tab');
        }
      }
      setEditingField(null);
      setTempValue('');
    }
    lastOpenedRef.current = isOpen;
  }, [initialTab, isOpen, isMobile, setActiveTab]);

  useEffect(() => {
    setEditingField(null);
    setTempValue('');
    if (activeTab === 'devices') {
      fetchConnectedSessions();
    }
  }, [activeTab, fetchConnectedSessions]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropTarget('profile');
        setCropImageSrc(reader.result as string);
        setIsCropModalOpen(true);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmationOpen(true);
  };

  const confirmLogout = async () => {
    onLogout();
    setIsLogoutConfirmationOpen(false);
  };

  const handleConfirmReset = () => {
    onReset();
    setShowResetFeedback(true);
    setTimeout(() => setShowResetFeedback(false), 3000);
  };

  if (mode === 'simple') {"

# Find the end of parameter list `}) => {` in content
param_end_pos = content.find("}) => {", start_pos)
if param_end_pos == -1:
    print("Param end not found")
    exit(1)

new_content = content[:param_end_pos] + clean_body + content[end_pos + len("  if (mode === 'simple') {"):]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully refactored SettingsModal hooks order.")
