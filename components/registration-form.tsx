'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormDatePicker,
  FormGrid,
  FormSection,
} from '@/components/form/form-elements';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  matricNumber: z.string().min(5, 'Valid matric number is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  faculty: z.string().min(2, 'Faculty is required'),
  department: z.string().min(2, 'Department is required'),
  level: z.string().min(1, 'Level is required'),
  dateOfBirth: z.date({
    required_error: 'Date of birth is required',
  }),
  gender: z.string({
    required_error: 'Gender is required',
  }),
  stateOfOrigin: z.string().min(2, 'State of origin is required'),
  address: z.string().min(5, 'Address is required'),
  emergencyContact: z.string().min(10, 'Emergency contact is required'),
  emergencyContactName: z.string().min(2, 'Emergency contact name is required'),
  emergencyContactRelationship: z.string().min(2, 'Relationship is required'),
});

const levelOptions = [
  { value: '100', label: '100 Level' },
  { value: '200', label: '200 Level' },
  { value: '300', label: '300 Level' },
  { value: '400', label: '400 Level' },
  { value: '500', label: '500 Level' },
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

interface RegistrationFormProps {
  paymentDetails: {
    rrr: string;
    amount: number;
    matricNumber?: string;
  } | null;
  onComplete: () => void;
}

export function RegistrationForm({
  paymentDetails,
  onComplete,
}: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      matricNumber: paymentDetails?.matricNumber || '',
      phoneNumber: '',
      faculty: '',
      department: '',
      level: '',
      gender: '',
      stateOfOrigin: '',
      address: '',
      emergencyContact: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      // Call the API to register the student
      const response = await fetch('/api/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          paymentRRR: paymentDetails?.rrr,
          paymentAmount: paymentDetails?.amount,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setIsCompleted(true);
      toast.success('Registration completed successfully');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className='py-4 space-y-6'>
        <div className='flex flex-col items-center justify-center text-center'>
          <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4'>
            <Check className='h-8 w-8 text-green-600' />
          </div>
          <h3 className='text-xl font-bold text-green-600'>
            Registration Successful!
          </h3>
          <p className='text-gray-600 mt-2'>
            Your hostel accommodation has been secured. You will receive a
            confirmation email shortly.
          </p>
        </div>

        <div className='bg-blue-50 p-4 rounded-md'>
          <p className='text-blue-800 text-sm'>
            Please check your email for further instructions on room allocation
            and move-in dates.
          </p>
        </div>

        <div className='flex justify-center'>
          <Button onClick={onComplete}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='py-6 max-h-[80vh]'>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className='space-y-5 pb-6'
        >
          <FormSection title='Personal Information'>
            <FormGrid>
              <FormInput
                name='firstName'
                label='First Name'
                placeholder='John'
                required
              />
              <FormInput
                name='lastName'
                label='Last Name'
                placeholder='Doe'
                required
              />
            </FormGrid>

            <FormGrid>
              <FormInput
                name='email'
                label='Email'
                type='email'
                placeholder='john.doe@example.com'
                required
              />
              <FormInput
                name='phoneNumber'
                label='Phone Number'
                placeholder='e.g., 08012345678'
                required
              />
            </FormGrid>
          </FormSection>

          <FormSection title='Academic Information'>
            <FormGrid>
              <FormInput
                name='matricNumber'
                label='Matric Number'
                placeholder='e.g., 2020/1234'
                required
              />
              <FormSelect
                name='level'
                label='Level'
                placeholder='Select level'
                options={levelOptions}
                required
              />
            </FormGrid>

            <FormGrid>
              <FormInput
                name='faculty'
                label='Faculty'
                placeholder='e.g., Engineering'
                required
              />
              <FormInput
                name='department'
                label='Department'
                placeholder='e.g., Computer Science'
                required
              />
            </FormGrid>
          </FormSection>

          <FormSection title='Personal Details'>
            <FormGrid>
              <FormDatePicker
                name='dateOfBirth'
                label='Date of Birth'
                required
              />
              <FormSelect
                name='gender'
                label='Gender'
                placeholder='Select gender'
                options={genderOptions}
                required
              />
            </FormGrid>

            <FormInput
              name='stateOfOrigin'
              label='State of Origin'
              placeholder='e.g., Lagos'
              required
            />

            <FormTextarea
              name='address'
              label='Home Address'
              placeholder='Enter your home address'
              required
            />
          </FormSection>

          <FormSection title='Emergency Contact'>
            <FormGrid>
              <FormInput
                name='emergencyContactName'
                label='Emergency Contact Name'
                placeholder='e.g., Jane Doe'
                required
              />
              <FormInput
                name='emergencyContact'
                label='Emergency Contact Number'
                placeholder='e.g., 08012345678'
                required
              />
            </FormGrid>

            <FormInput
              name='emergencyContactRelationship'
              label='Relationship with Emergency Contact'
              placeholder='e.g., Parent, Sibling'
              required
            />
          </FormSection>

          <div className='bg-blue-50 p-3 rounded-md mt-4'>
            <p className='text-blue-800 text-xs'>
              By submitting this form, you agree to the hostel terms and
              conditions. Your room allocation will be processed based on
              availability.
            </p>
          </div>

          <div className='flex justify-end pt-2'>
            <Button
              type='submit'
              disabled={isSubmitting}
              className='bg-slate-500 text-white'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Submitting...
                </>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
