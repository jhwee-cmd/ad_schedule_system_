'use client'

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectCheckboxProps {
  options: Option[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
  exclusiveValue?: string; // For "Non-target" like options
}

export default function MultiSelectCheckbox({
  options,
  selectedValues,
  onChange,
  placeholder,
  className = '',
  exclusiveValue
}: MultiSelectCheckboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() =>
    options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [options, searchTerm]
  );
  
  const selectableOptions = options.filter(opt => opt.value !== exclusiveValue);

  const isAllSelected = useMemo(() => {
    if (selectableOptions.length === 0) return false;
    return selectableOptions.every(opt => selectedValues.includes(opt.value));
  }, [selectedValues, selectableOptions]);

  const displayLabel = useMemo(() => {
    if (isAllSelected) {
      return '전체 선택됨';
    }
    if (selectedValues.length > 0) {
      return options
        .filter(option => selectedValues.includes(option.value))
        .map(option => option.label)
        .join(', ');
    }
    return placeholder;
  }, [options, selectedValues, isAllSelected, placeholder]);

  const handleToggle = (value: string) => {
    let newSelection;
    if (value === exclusiveValue) {
      newSelection = selectedValues.includes(value) ? [] : [value];
    } else {
      const currentSelection = selectedValues.filter(v => v !== exclusiveValue);
      if (currentSelection.includes(value)) {
        newSelection = currentSelection.filter(v => v !== value);
      } else {
        newSelection = [...currentSelection, value];
      }
    }
    onChange(newSelection);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange(selectedValues.includes(exclusiveValue || '') ? [exclusiveValue || ''] : []);
    } else {
      const allSelectableValues = selectableOptions.map(opt => opt.value);
      onChange(allSelectableValues);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="border rounded-md bg-white">
        <div className="p-2 min-h-[40px] cursor-pointer flex items-center justify-between" onClick={() => setIsOpen(!isOpen)}>
            <span className={selectedValues.length > 0 ? "text-sm text-gray-800 font-semibold" : "text-sm text-gray-500"}>
                {displayLabel}
            </span>
            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        {isOpen && (
            <div className="absolute top-full left-0 w-full bg-white border rounded-md mt-1 z-10 shadow-lg">
                <div className="p-2 border-b space-y-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="검색..."
                            className="w-full pl-8 pr-2 py-1.5 border rounded-md text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="w-full text-left px-2 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {isAllSelected ? '전체 해제' : '전체 선택'}
                    </button>
                </div>
                <div className="max-h-48 overflow-y-auto p-2">
                    {filteredOptions.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={selectedValues.includes(option.value)}
                                onChange={() => handleToggle(option.value)}
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
