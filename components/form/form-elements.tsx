'use client';

import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Text input field
interface FormInputProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}

export function FormInput({
  name,
  label,
  placeholder = '',
  type = 'text',
  required = false,
  className = '',
}: FormInputProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className='text-red-500 ml-1'>*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              onChange={
                type === 'number'
                  ? (e) => field.onChange(Number(e.target.value))
                  : field.onChange
              }
              className='h-9 bg-white'
            />
          </FormControl>
          <FormMessage className='text-red-500' />
        </FormItem>
      )}
    />
  );
}

// Textarea field
interface FormTextareaProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function FormTextarea({
  name,
  label,
  placeholder = '',
  required = false,
  className = '',
}: FormTextareaProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className='text-red-500 ml-1'>*</span>}
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              className='resize-none bg-white'
              {...field}
            />
          </FormControl>
          <FormMessage className='text-red-500' />
        </FormItem>
      )}
    />
  );
}

// Select field
interface FormSelectProps {
  name: string;
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export function FormSelect({
  name,
  label,
  placeholder = 'Select option',
  options,
  required = false,
  className = '',
}: FormSelectProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className='text-red-500 ml-1'>*</span>}
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className='h-9 bg-white'>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className='bg-white'>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className='hover:bg-gray-100 cursor-pointer'
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className='text-red-500' />
        </FormItem>
      )}
    />
  );
}

// Date picker field with dropdown
interface FormDatePickerProps {
  name: string;
  label: string;
  required?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
}

export function FormDatePicker({
  name,
  label,
  required = false,
  className = '',
  fromYear = 1900,
  toYear = new Date().getFullYear(),
}: FormDatePickerProps) {
  const form = useFormContext();
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  // Generate arrays for days, months, and years
  const days = Array.from({ length: 31 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString(),
  }));

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => ({
    value: (toYear - i).toString(),
    label: (toYear - i).toString(),
  }));

  // Get max days for the selected month
  const getMaxDays = () => {
    if (!month) return 31;

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10) || new Date().getFullYear();

    if (monthNum === 2) {
      // Check for leap year
      return (yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0
        ? 29
        : 28;
    }

    return [4, 6, 9, 11].includes(monthNum) ? 30 : 31;
  };

  // Set field value when day, month, or year changes
  useEffect(() => {
    if (day && month && year) {
      try {
        const dateObj = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        // Make sure the date is valid
        if (!isNaN(dateObj.getTime())) {
          form.setValue(name, dateObj);
        }
      } catch (e) {
        console.error('Invalid date', e);
      }
    }
  }, [day, month, year, form, name]);

  // Initialize from form value
  useEffect(() => {
    const value = form.getValues(name);
    if (value && value instanceof Date) {
      setDay(value.getDate().toString());
      setMonth((value.getMonth() + 1).toString());
      setYear(value.getFullYear().toString());
    }
  }, [form, name]);

  // Adjust day if it exceeds max days for the month
  useEffect(() => {
    const maxDays = getMaxDays();
    if (day && parseInt(day, 10) > maxDays) {
      setDay(maxDays.toString());
    }
  }, [month, year]);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('space-y-1', className)}>
          <FormLabel>
            {label}
            {required && <span className='text-red-500 ml-1'>*</span>}
          </FormLabel>

          <div className='flex space-x-2'>
            {/* Day Select */}
            <div className='w-1/4'>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className='h-9 bg-white'>
                  <SelectValue placeholder='Day' />
                </SelectTrigger>
                <SelectContent className='max-h-[200px] overflow-y-auto bg-white'>
                  {days.slice(0, getMaxDays()).map((d) => (
                    <SelectItem
                      key={d.value}
                      value={d.value}
                      className='hover:bg-gray-100 cursor-pointer'
                    >
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Select */}
            <div className='w-2/5'>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className='h-9 bg-white'>
                  <SelectValue placeholder='Month' />
                </SelectTrigger>
                <SelectContent className='bg-white'>
                  {months.map((m) => (
                    <SelectItem
                      key={m.value}
                      value={m.value}
                      className='hover:bg-gray-100 cursor-pointer'
                    >
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Select */}
            <div className='w-1/3'>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className='h-9 bg-white'>
                  <SelectValue placeholder='Year' />
                </SelectTrigger>
                <SelectContent className='max-h-[200px] overflow-y-auto bg-white'>
                  {years.map((y) => (
                    <SelectItem
                      key={y.value}
                      value={y.value}
                      className='hover:bg-gray-100 cursor-pointer'
                    >
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FormMessage className='text-red-500' />
        </FormItem>
      )}
    />
  );
}

// Form grid container
interface FormGridProps {
  children: React.ReactNode;
  columns?: number;
  className?: string;
}

export function FormGrid({
  children,
  columns = 2,
  className = '',
}: FormGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3',
        columns === 2 && 'md:grid-cols-2',
        columns === 3 && 'md:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

// Form section with heading
interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function FormSection({
  children,
  title,
  className = '',
}: FormSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && <h3 className='text-sm font-medium text-gray-700'>{title}</h3>}
      {children}
    </div>
  );
}
