package auth

func NewDefaultStore() (Store, error) {
	fileStore, err := NewFileStore("")
	if err != nil {
		return nil, err
	}
	keyringStore := NewKeyringStore("openplane-cli")
	return NewCompositeStore(keyringStore, fileStore), nil
}
