Page({
  data: {
    deviceList: [],
    selectedDeviceIndex: -1,
    selectedDeviceId: '',
    isScanning: false,
    isConnected: false,
    isBluetoothOpen: false,
    serviceList: [],
    selectedServiceIndex: 0,
    selectedServiceUuid: '',
    characteristicList: [],
    selectedCharacteristicIndex: 0,
    selectedCharacteristicUuid: '',
    rxData: '',
    rxNodes: [],
    rxRawData: [],
    rxTimestamp: false,
    rxEncode: 'ascii',
    rxEncodeIndex: 1,
    autoWrap: true,
    sendContent: '',
    sendEncode: 'ascii',
    sendEncodeIndex: 1,
    sendTimer: false,
    sendInterval: 1000,
    sendTimerActive: false,
    sendTimestamp: false,
    showPackages: false,
    packageTimer: false,
    packageInterval: 1000,
    packageTimerActive: false,
    packageList: [
      { id: 1, content: '', encode: 'ascii', encodeIndex: 1, checked: false },
    ],
    encodeOptions: ['十六进制', 'ASCII', 'UTF-8', 'GB2312'],
    encodeValues: ['hex', 'ascii', 'utf8', 'gbk'],
  },

  onLoad() {},

  onUnload() {
    this.closeConnection();
    this.stopScan();
    this.stopAllTimers();
  },

  toggleBluetooth() {
    if (this.data.isBluetoothOpen) {
      this.closeBluetooth();
    } else {
      this.openBluetooth();
    }
  },

  openBluetooth() {
    wx.showLoading({ title: '开启蓝牙...' });
    wx.openBluetoothAdapter({
      success: () => {
        console.log('[BT] Bluetooth adapter initialized');
        this.setData({ isBluetoothOpen: true });
        this.startScan();
        wx.showToast({ title: '蓝牙已开启', icon: 'success' });
      },
      fail: (err) => {
        console.error('[BT] Bluetooth adapter init failed', err);
        wx.hideLoading();
        wx.showModal({
          title: '蓝牙未开启',
          content: '请先在手机系统设置中开启蓝牙',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      },
      complete: () => {
        if (!wx.showToast) wx.hideLoading();
      },
    });
  },

  closeBluetooth() {
    this.closeConnection();
    this.stopScan();
    wx.closeBluetoothAdapter({
      success: () => {
        console.log('[BT] Bluetooth adapter closed');
        this.setData({
          isBluetoothOpen: false,
          deviceList: [],
          selectedDeviceIndex: -1,
          selectedDeviceId: '',
        });
        wx.showToast({ title: '蓝牙已关闭', icon: 'none' });
      },
      fail: (err) => {
        console.error('[BT] Close bluetooth failed', err);
      },
    });
  },

  stopAllTimers() {
    if (this.sendTimerId) {
      clearInterval(this.sendTimerId);
      this.sendTimerId = null;
    }
    if (this.packageTimerId) {
      clearInterval(this.packageTimerId);
      this.packageTimerId = null;
    }
  },

  startScan() {
    this.setData({
      deviceList: [],
      selectedDeviceIndex: -1,
      selectedDeviceId: '',
      isScanning: true,
    });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => {
        console.log('[BT] Start scanning');
        this.onDeviceFound();
      },
      fail: (err) => {
        console.error('[BT] Scan failed', err);
        this.setData({ isScanning: false });
      },
    });

    this.scanTimer = setTimeout(() => {
      if (this.data.isScanning) {
        this.stopScan();
        wx.showToast({ title: '扫描结束', icon: 'none' });
      }
    }, 10000);
  },

  stopScan() {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('[BT] Stop scanning');
      },
    });
    this.setData({ isScanning: false });
  },

  onDeviceFound() {
    if (this.deviceFoundListener) {
      wx.offBluetoothDeviceFound(this.deviceFoundListener);
    }
    this.deviceFoundListener = (res) => {
      const newDevices = res.devices.filter((d) => d.name || d.localName);
      if (newDevices.length === 0) return;

      const currentList = this.data.deviceList;
      const updatedList = [...currentList];

      newDevices.forEach((device) => {
        const exists = updatedList.some((d) => d.deviceId === device.deviceId);
        if (!exists) {
          updatedList.push({
            deviceId: device.deviceId,
            name: device.name || device.localName || '未知设备',
            RSSI: device.RSSI,
          });
        }
      });

      this.setData({ deviceList: updatedList });
    };
    wx.onBluetoothDeviceFound(this.deviceFoundListener);
  },

  onDeviceChange(e) {
    const index = parseInt(e.detail.value, 10);
    const device = this.data.deviceList[index];
    this.setData({
      selectedDeviceIndex: index,
      selectedDeviceId: device.deviceId,
    });
    console.log('[BT] Selected device', device.name, device.deviceId);
  },

  toggleConnect() {
    if (this.data.isConnected) {
      this.closeConnection();
    } else {
      this.connectDevice();
    }
  },

  connectDevice() {
    const { selectedDeviceId, selectedDeviceIndex } = this.data;
    if (selectedDeviceIndex === -1) {
      wx.showToast({ title: '请先选择设备', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '连接中...' });

    wx.createBLEConnection({
      deviceId: selectedDeviceId,
      timeout: 10000,
      success: () => {
        console.log('[BT] createBLEConnection called');
      },
      fail: (err) => {
        console.error('[BT] createBLEConnection failed', err);
        wx.hideLoading();
        wx.showToast({ title: '连接失败', icon: 'none', duration: 3000 });
        return;
      },
    });

    wx.onBLEConnectionStateChange((res) => {
      if (res.deviceId === selectedDeviceId) {
        if (res.connected) {
          console.log('[BT] Device connected');
          wx.hideLoading();
          this.setData({ isConnected: true });
          wx.showToast({ title: '连接成功', icon: 'success' });
          setTimeout(() => {
            this.getServices(selectedDeviceId);
          }, 500);
        } else {
          console.log('[BT] Device disconnected');
          if (this.data.isConnected) {
            this.setData({ isConnected: false });
            wx.showToast({ title: '连接已断开', icon: 'none' });
          }
        }
      }
    });
  },

  closeConnection() {
    this.stopAllTimers();
    const { selectedDeviceId } = this.data;
    if (selectedDeviceId) {
      wx.closeBLEConnection({
        deviceId: selectedDeviceId,
        success: () => {
          console.log('[BT] Disconnected');
        },
        fail: (err) => {
          console.error('[BT] Disconnect failed', err);
        },
      });
    }
    this.setData({
      isConnected: false,
      serviceList: [],
      selectedServiceIndex: 0,
      selectedServiceUuid: '',
      characteristicList: [],
      selectedCharacteristicIndex: 0,
      selectedCharacteristicUuid: '',
    });
  },

  getServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        console.log('[BT] Services', res.services);
        const services = res.services.filter(
          (s) => s.uuid && !s.uuid.startsWith('00001800') && !s.uuid.startsWith('00001801')
        );
        if (services.length === 0) services.push(...res.services);
        this.setData({
          serviceList: services,
          selectedServiceIndex: 0,
          selectedServiceUuid: services[0]?.uuid || '',
        });
        if (services[0]) {
          this.getCharacteristics(deviceId, services[0].uuid);
        }
      },
      fail: (err) => {
        console.error('[BT] Get services failed', err);
      },
    });
  },

  onServiceChange(e) {
    const index = parseInt(e.detail.value, 10);
    const service = this.data.serviceList[index];
    this.setData({
      selectedServiceIndex: index,
      selectedServiceUuid: service.uuid,
    });
    this.getCharacteristics(this.data.selectedDeviceId, service.uuid);
  },

  getCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('[BT] Characteristics', res.characteristics);
        const chars = res.characteristics;
        this.setData({
          characteristicList: chars,
          selectedCharacteristicIndex: 0,
          selectedCharacteristicUuid: chars[0]?.uuid || '',
        });
        if (chars[0]) {
          this.notifyCharacteristic(deviceId, serviceId, chars[0].uuid);
        }
      },
      fail: (err) => {
        console.error('[BT] Get characteristics failed', err);
      },
    });
  },

  onCharacteristicChange(e) {
    const index = parseInt(e.detail.value, 10);
    const char = this.data.characteristicList[index];
    this.setData({
      selectedCharacteristicIndex: index,
      selectedCharacteristicUuid: char.uuid,
    });
    this.notifyCharacteristic(this.data.selectedDeviceId, this.data.selectedServiceUuid, char.uuid);
  },

  notifyCharacteristic(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId,
      serviceId,
      characteristicId,
      state: true,
      success: () => {
        console.log('[BT] Notify enabled', characteristicId);
      },
      fail: (err) => {
        console.error('[BT] Notify failed', err);
      },
    });

    wx.onBLECharacteristicValueChange((res) => {
      const bytes = new Uint8Array(res.value);
      
      const now = new Date();
      const timeStr = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0') + '.' +
        now.getMilliseconds().toString().padStart(3, '0');

      this.data.rxRawData.push({
        bytes: Array.from(bytes),
        timestamp: timeStr
      });

      const str = this.decodeBytes(bytes, this.data.rxEncode);
      
      const newNodes = [...this.data.rxNodes];
      if (this.data.rxTimestamp) {
        newNodes.push({
          name: 'span',
          attrs: { style: 'color:#ff7d00;' },
          children: [{ type: 'text', text: timeStr + ': ' }]
        });
      }
      newNodes.push({
        name: 'span',
        attrs: { style: 'color:#a78bfa;' },
        children: [{ type: 'text', text: str }]
      });
      if (this.data.autoWrap) {
        newNodes.push({ type: 'text', text: '\n' });
      }

      this.setData({ rxNodes: newNodes });
      console.log('[BT] Received data', str);
    });
  },

  decodeBytes(bytes, encode) {
    let str = '';
    if (encode === 'hex') {
      str = bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    } else if (encode === 'ascii') {
      str = String.fromCharCode(...bytes);
    } else if (encode === 'utf8') {
      str = this.uint8ArrayToString(bytes, 'utf8');
    } else if (encode === 'gbk') {
      str = this.uint8ArrayToString(bytes, 'gbk');
    }
    return str;
  },

  uint8ArrayToString(bytes, encoding) {
    try {
      if (encoding === 'utf8') {
        return new TextDecoder('utf-8').decode(bytes);
      } else {
        return String.fromCharCode(...bytes);
      }
    } catch (e) {
      return String.fromCharCode(...bytes);
    }
  },

  sendData() {
    const { sendContent, sendEncode, sendTimer, sendTimerActive, sendTimestamp } = this.data;
    if (!sendContent) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    if (sendTimerActive) {
      if (this.sendTimerId) {
        clearInterval(this.sendTimerId);
        this.sendTimerId = null;
      }
      this.setData({ sendTimerActive: false });
      return;
    }

    if (sendTimer) {
      this.setData({ sendTimerActive: true });
      this.sendTimerId = setInterval(() => {
        this._sendData(sendContent, sendEncode, sendTimestamp);
      }, parseInt(this.data.sendInterval) || 1000);
    } else {
      this._sendData(sendContent, sendEncode, sendTimestamp);
    }
  },

  toggleSendTimer() {
    this.setData({ sendTimer: !this.data.sendTimer });
  },

  onSendContentChange(e) {
    this.setData({ sendContent: e.detail.value });
  },

  onSendEncodeChange(e) {
    const index = parseInt(e.detail.value, 10);
    this.setData({ 
      sendEncode: this.data.encodeValues[index],
      sendEncodeIndex: index
    });
  },

  onSendIntervalChange(e) {
    this.setData({ sendInterval: e.detail.value });
    if (this.data.sendTimerActive && this.sendTimerId) {
      clearInterval(this.sendTimerId);
      this.sendTimerId = setInterval(() => {
        this._sendData(this.data.sendContent, this.data.sendEncode);
      }, parseInt(e.detail.value) || 1000);
    }
  },

  togglePackages() {
    this.setData({ showPackages: !this.data.showPackages });
  },

  sendDataById(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10);
    const pkg = this.data.packageList.find((p) => p.id === id);
    if (!pkg || !pkg.content) return;

    this._sendData(pkg.content, pkg.encode, true);
  },

  sendCheckedPackages() {
    const checkedList = this.data.packageList.filter((p) => p.checked && p.content);
    if (checkedList.length === 0) {
      wx.showToast({ title: '请勾选要发送的包', icon: 'none' });
      return;
    }
    checkedList.forEach((pkg) => {
      this._sendData(pkg.content, pkg.encode, true);
    });
    wx.showToast({ title: '已发送 ' + checkedList.length + ' 条', icon: 'success' });
  },

  _sendData(content, encode, showTimestamp = false) {
    const { selectedDeviceId, selectedServiceUuid, selectedCharacteristicUuid } = this.data;
    if (!selectedCharacteristicUuid) {
      wx.showToast({ title: '未选择特征值', icon: 'none' });
      return;
    }

    let buffer;
    try {
      if (encode === 'hex') {
        const hexStr = content.replace(/\s/g, '');
        if (!/^[0-9A-Fa-f]*$/.test(hexStr) || hexStr.length % 2 !== 0) {
          wx.showToast({ title: '十六进制格式错误', icon: 'none' });
          return;
        }
        const bytes = [];
        for (let i = 0; i < hexStr.length; i += 2) {
          bytes.push(parseInt(hexStr.substr(i, 2), 16));
        }
        buffer = new Uint8Array(bytes).buffer;
      } else if (encode === 'utf8') {
        buffer = new TextEncoder().encode(content).buffer;
      } else {
        const bytes = [];
        for (let i = 0; i < content.length; i++) {
          bytes.push(content.charCodeAt(i) & 0xFF);
        }
        buffer = new Uint8Array(bytes).buffer;
      }
    } catch (e) {
      console.error('[BT] Encode error', e);
      wx.showToast({ title: '编码错误', icon: 'none' });
      return;
    }

    wx.writeBLECharacteristicValue({
      deviceId: selectedDeviceId,
      serviceId: selectedServiceUuid,
      characteristicId: selectedCharacteristicUuid,
      value: buffer,
      success: () => {
        console.log('[BT] Send success', buffer.byteLength, 'bytes');
        this.appendSendData(content, showTimestamp);
      },
      fail: (err) => {
        console.error('[BT] Send failed', err);
        wx.showToast({ title: '发送失败', icon: 'none' });
      },
    });
  },

  appendSendData(content, showTimestamp = false) {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' +
      now.getMinutes().toString().padStart(2, '0') + ':' +
      now.getSeconds().toString().padStart(2, '0') + '.' +
      now.getMilliseconds().toString().padStart(3, '0');

    const newNodes = [...this.data.rxNodes];
    if (this.data.sendTimestamp || showTimestamp) {
      newNodes.push({
        name: 'span',
        attrs: { style: 'color:#00b42a;' },
        children: [{ type: 'text', text: timeStr + ': ' }]
      });
    }
    newNodes.push({
      name: 'span',
      attrs: { style: 'color:#4dabf7;' },
      children: [{ type: 'text', text: content }]
    });
    if (this.data.autoWrap) {
      newNodes.push({ type: 'text', text: '\n' });
    }

    this.setData({ rxNodes: newNodes });
  },

  addPackage() {
    const newId = this.data.packageList.length > 0 ? Math.max(...this.data.packageList.map(p => p.id)) + 1 : 1;
    this.data.packageList.push({
      id: newId,
      content: '',
      encode: 'ascii',
      encodeIndex: 1,
      checked: false,
    });
    this.setData({ packageList: this.data.packageList });
  },

  removePackage(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10);
    if (this.data.packageList.length <= 1) {
      wx.showToast({ title: '至少保留一条', icon: 'none' });
      return;
    }
    this.data.packageList = this.data.packageList.filter((p) => p.id !== id);
    
    // 重新编号所有包
    this.data.packageList.forEach((pkg, index) => {
      pkg.id = index + 1;
    });
    
    this.setData({ packageList: this.data.packageList });
  },

  onPackageContentChange(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10);
    const pkg = this.data.packageList.find((p) => p.id === id);
    if (pkg) {
      pkg.content = e.detail.value;
      this.setData({ packageList: this.data.packageList });
    }
  },

  onPackageEncodeChange(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10);
    const index = parseInt(e.detail.value, 10);
    const pkg = this.data.packageList.find((p) => p.id === id);
    if (pkg) {
      pkg.encode = this.data.encodeValues[index];
      pkg.encodeIndex = index;
      this.setData({ packageList: this.data.packageList });
    }
  },

  togglePackageTimer() {
    this.setData({ packageTimer: !this.data.packageTimer });
  },

  onPackageIntervalChange(e) {
    this.setData({ packageInterval: e.detail.value });
    if (this.data.packageTimerActive && this.packageTimerId) {
      clearInterval(this.packageTimerId);
      this.packageTimerId = setInterval(() => {
        this.sendCheckedPackages();
      }, parseInt(e.detail.value) || 1000);
    }
  },

  togglePackageTimerActive() {
    if (this.data.packageTimerActive) {
      if (this.packageTimerId) {
        clearInterval(this.packageTimerId);
        this.packageTimerId = null;
      }
      this.setData({ packageTimerActive: false });
    } else {
      const checkedPackages = this.data.packageList.filter((p) => p.checked && p.content);
      if (checkedPackages.length === 0) {
        wx.showToast({ title: '请先勾选要发送的包', icon: 'none' });
        return;
      }
      this.setData({ packageTimerActive: true });
      this.packageTimerId = setInterval(() => {
        this.sendCheckedPackages();
      }, parseInt(this.data.packageInterval) || 1000);
    }
  },

  togglePackageChecked(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10);
    const pkg = this.data.packageList.find((p) => p.id === id);
    if (pkg) {
      pkg.checked = !pkg.checked;
      this.setData({ packageList: this.data.packageList });
    }
  },

  clearRx() {
    this.setData({ rxData: '', rxNodes: [], rxRawData: [] });
  },

  toggleRxTimestamp() {
    this.setData({ rxTimestamp: !this.data.rxTimestamp });
    this.rebuildRxNodes();
  },

  onRxEncodeChange(e) {
    const index = parseInt(e.detail.value, 10);
    this.setData({ 
      rxEncode: this.data.encodeValues[index],
      rxEncodeIndex: index
    });
    this.rebuildRxNodes();
  },

  rebuildRxNodes() {
    const newNodes = [];
    const encode = this.data.rxEncode;
    const showTimestamp = this.data.rxTimestamp;
    
    this.data.rxRawData.forEach((item) => {
      if (showTimestamp) {
        newNodes.push({
          name: 'span',
          attrs: { style: 'color:#ff7d00;' },
          children: [{ type: 'text', text: item.timestamp + ': ' }]
        });
      }
      const str = this.decodeBytes(item.bytes, encode);
      newNodes.push({
        name: 'span',
        attrs: { style: 'color:#a78bfa;' },
        children: [{ type: 'text', text: str }]
      });
      if (this.data.autoWrap) {
        newNodes.push({ type: 'text', text: '\n' });
      }
    });
    
    this.setData({ rxNodes: newNodes });
  },

  toggleAutoWrap() {
    this.setData({ autoWrap: !this.data.autoWrap });
  },

  toggleSendTimestamp() {
    this.setData({ sendTimestamp: !this.data.sendTimestamp });
  },
});
